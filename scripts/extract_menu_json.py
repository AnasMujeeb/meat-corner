import pdfplumber
import json
import re

def clean_cell(val):
    if val is None:
        return ""
    val = str(val).strip()
    return val

def parse_price(val):
    if not val:
        return 0
    # Match numbers like "285", "599/1kg", "45", etc.
    val = clean_cell(val)
    m = re.search(r'(\d+(?:\.\d+)?)', val)
    if m:
        try:
            return float(m.group(1))
        except:
            return 0
    return 0

def main():
    pdf_path = 'Copy of Meat Corner Menu Reference Master sheet - Master Menu Reference.pdf'
    output_path = 'scripts/menu_data.json'

    with pdfplumber.open(pdf_path) as pdf:
        all_items = []
        headers = None
        current_category = ""

        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables:
                for row_idx, row in enumerate(table):
                    if not any(row):
                        continue
                    cleaned_row = [clean_cell(c) for c in row]

                    # Detect header
                    if 'Category' in cleaned_row[0] or (cleaned_row[0] == '' and len(cleaned_row) > 1 and 'Item Name' in cleaned_row[1]):
                        headers = [
                            'category',
                            'name_en',
                            'name_ar',
                            'description_en',
                            'description_ar',
                            'price_raw',
                            'addons_main_course',
                            'healthy_addons',
                            'sides_rule',
                            'side_dishes',
                            'doneness_rule',
                            'doneness_options',
                            'patty_options',
                            'sauces_rule',
                            'sauce_options',
                            'nutritional_value'
                        ]
                        continue

                    if not headers:
                        continue

                    # If row has header repetition
                    if cleaned_row[0] == 'Category' or (len(cleaned_row) > 1 and 'Item Name' in cleaned_row[1]):
                        continue

                    # Build item dict
                    item = {}
                    for i, key in enumerate(headers):
                        item[key] = cleaned_row[i] if i < len(cleaned_row) else ""

                    # Category fill-down if category is blank in table
                    cat = item['category'].replace('\n', ' ').strip()
                    if cat:
                        current_category = cat
                    else:
                        item['category'] = current_category

                    # Clean category name (e.g., "Wagyu steaks & BurgersLuxurious" -> "Wagyu Steaks & Burgers")
                    # If category got concatenated with item name in some OCR/table cell:
                    name_en = item['name_en'].strip()
                    if not name_en and not item['price_raw']:
                        continue

                    # Handle case where category column merged with item name:
                    # e.g. "Wagyu steaks & BurgersLuxurious Wagyu Tenderloin Mb 4 to 5"
                    if 'Wagyu steaks & Burgers' in cat and not name_en:
                        item['category'] = 'Wagyu Steaks & Burgers'
                        item['name_en'] = cat.replace('Wagyu steaks & Burgers', '').strip()
                    elif 'Wagyu steaks & Burgers' in cat:
                        item['category'] = 'Wagyu Steaks & Burgers'

                    item['price'] = parse_price(item['price_raw'])

                    all_items.append(item)

        print(f"Extracted {len(all_items)} valid items.")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_items, f, ensure_ascii=False, indent=2)
        print(f"Saved to {output_path}")

if __name__ == '__main__':
    main()
