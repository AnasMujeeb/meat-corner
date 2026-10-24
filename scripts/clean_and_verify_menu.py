import json
import re

def clean_text(text):
    if not text:
        return ""
    text = text.replace('\n', ' ').strip()
    text = re.sub(r'\s+', ' ', text)
    return text

def clean_item_name(name):
    name = clean_text(name)
    # Fix OCR / column overlap prefixes
    prefixes_to_strip = [
        'eLrusxurious', 'eWrsagyu', 'ePrrsemium', 'eLrus', 'eWrs', 'ePrr'
    ]
    for p in prefixes_to_strip:
        if name.startswith(p):
            if p == 'eLrusxurious':
                name = 'Luxurious' + name[len(p):]
            elif p == 'eWrsagyu':
                name = 'Wagyu' + name[len(p):]
            elif p == 'ePrrsemium':
                name = 'Premium' + name[len(p):]
            else:
                name = name[len(p):].strip()

    name = re.sub(r'\s+', ' ', name).strip()
    return name

def normalize_category(cat):
    cat = clean_text(cat)
    cat_lower = cat.lower()
    if 'try our new' in cat_lower:
        return 'New Additions'
    if 'appetizer' in cat_lower:
        return 'Appetizers'
    if 'sandwich' in cat_lower:
        return 'Sandwiches & Burgers'
    if 'main course' in cat_lower:
        return 'Main Courses'
    if 'side' in cat_lower:
        return 'Side Dishes'
    if 'salad' in cat_lower:
        return 'Salads'
    if 'beverage' in cat_lower or 'drink' in cat_lower:
        return 'Beverages'
    if 'sauce' in cat_lower:
        return 'Sauces'
    if 'dessert' in cat_lower:
        return 'Desserts'
    if 'special' in cat_lower:
        return 'Special Dishes'
    if 'wagyu' in cat_lower:
        return 'Wagyu Steaks & Burgers'
    if 'healthy' in cat_lower:
        return 'Healthy Dishes'
    return cat.title()

def main():
    with open('scripts/menu_data.json', encoding='utf-8') as f:
        items = json.load(f)

    cleaned_items = []
    seen = set()

    for it in items:
        name_en = clean_item_name(it.get('name_en', ''))
        if not name_en:
            continue

        cat = normalize_category(it.get('category', ''))
        desc_en = clean_text(it.get('description_en', ''))
        desc_ar = clean_text(it.get('description_ar', ''))
        name_ar = clean_text(it.get('name_ar', ''))
        price = it.get('price', 0)

        # Options / rules
        sides_rule = clean_text(it.get('sides_rule', ''))
        side_dishes = clean_text(it.get('side_dishes', ''))
        doneness_rule = clean_text(it.get('doneness_rule', ''))
        doneness_options = clean_text(it.get('doneness_options', ''))
        sauces_rule = clean_text(it.get('sauces_rule', ''))
        sauce_options = clean_text(it.get('sauce_options', ''))
        nutritional_value = clean_text(it.get('nutritional_value', ''))

        key = (cat, name_en)
        if key in seen:
            continue
        seen.add(key)

        cleaned_items.append({
            'category': cat,
            'name_en': name_en,
            'name_ar': name_ar,
            'description_en': desc_en,
            'description_ar': desc_ar,
            'price': price,
            'sides_rule': sides_rule,
            'side_dishes': side_dishes,
            'doneness_rule': doneness_rule,
            'doneness_options': doneness_options,
            'sauces_rule': sauces_rule,
            'sauce_options': sauce_options,
            'nutritional_value': nutritional_value,
        })

    with open('scripts/menu_data_cleaned.json', 'w', encoding='utf-8') as f:
        json.dump(cleaned_items, f, ensure_ascii=False, indent=2)

    print(f"Total cleaned authentic items: {len(cleaned_items)}")
    cat_counts = {}
    for it in cleaned_items:
        cat_counts[it['category']] = cat_counts.get(it['category'], 0) + 1
    for cat, count in sorted(cat_counts.items()):
        print(f"  • {cat}: {count} items")

if __name__ == '__main__':
    main()
