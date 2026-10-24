import json
import re
import os

with open('scripts/menu_data_cleaned.json', encoding='utf-8') as f:
    items = json.load(f)

with open('scripts/media_mapping.json', encoding='utf-8') as f:
    media_map = json.load(f)

# Helper for slugify
def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text

# Media lookup: slug -> media entry
# e.g. 'wagyu-ribeye-entrecote-steak' -> { url, thumbUrl }
def find_image(name, category):
    s = slugify(name)
    if s in media_map:
        return media_map[s]

    # Partial / keyword match
    tokens = set(re.findall(r'[a-z0-9]+', s.replace('-', ' ')))
    best_match = None
    best_score = 0
    for m_slug, entry in media_map.items():
        m_tokens = set(re.findall(r'[a-z0-9]+', m_slug.replace('-', ' ')))
        inter = len(tokens.intersection(m_tokens))
        if inter > 0:
            score = inter / max(len(tokens), len(m_tokens))
            if score > best_score:
                best_score = score
                best_match = entry

    if best_score >= 0.4:
        return best_match

    # Category fallback images
    cat_fallbacks = {
        'Wagyu Steaks & Burgers': 'wagyu-ribeye-entrecote-steak',
        'New Additions': 'wagyu-striploin-entrecote-steak',
        'Main Courses': 'fillet-mignon-steak-200g',
        'Special Dishes': 'cowboy-giant-plate',
        'Appetizers': 'meat-corner-nachos',
        'Sandwiches & Burgers': 'philly-cheese-steak',
        'Healthy Dishes': 'chicken-shawarma-bowl',
        'Salads': 'meat-corner-salad',
        'Side Dishes': 'cajun-potato-wedges',
        'Beverages': 'blueberry-mojito',
        'Sauces': 'entrecote-sauce',
        'Desserts': 'energy-date-balls'
    }
    fb_slug = cat_fallbacks.get(category)
    if fb_slug and fb_slug in media_map:
        return media_map[fb_slug]
    return None

CATEGORY_DEFS = [
    {
        "name": "New Additions",
        "description": "Exclusive chef specials, signature Wagyu cuts, and exciting new culinary creations.",
        "image": "/uploads/processed/wagyu-striploin-entrecote-steak.webp",
        "order": 0
    },
    {
        "name": "Wagyu Steaks & Burgers",
        "description": "Premium Japanese & Australian Wagyu beef, marbled cuts, and juicy smash burgers.",
        "image": "/uploads/processed/wagyu-ribeye-entrecote-steak.webp",
        "order": 1
    },
    {
        "name": "Special Dishes",
        "description": "Signature steak boxes, supreme entrecôte platters, and specialty meat combinations.",
        "image": "/uploads/processed/black-angus-ribeye-entrecote-steak.webp",
        "order": 2
    },
    {
        "name": "Main Courses",
        "description": "Charcoal-grilled steaks, salmon fillets, flamed chicken breasts, and signature bowls.",
        "image": "/uploads/processed/fillet-mignon-steak-200g.webp",
        "order": 3
    },
    {
        "name": "Sandwiches & Burgers",
        "description": "Smoky pulled beef, philly cheesesteaks, truffle burgers, and artisan brioche rolls.",
        "image": "/uploads/processed/philly-cheese-steak.webp",
        "order": 4
    },
    {
        "name": "Healthy Dishes",
        "description": "Macro-balanced high-protein meals, grilled lean meats, clean carbs, and light dressings.",
        "image": "/uploads/processed/chicken-shawarma-bowl.webp",
        "order": 5
    },
    {
        "name": "Appetizers",
        "description": "Crispy bites, loaded fries, cheesy appetizers, and savory starters to kick off your feast.",
        "image": "/uploads/processed/meat-corner-nachos.webp",
        "order": 6
    },
    {
        "name": "Salads",
        "description": "Farm-fresh vibrant greens, grilled tenderloin salads, nachos bowls, and house vinaigrettes.",
        "image": "/uploads/processed/meat-corner-salad.webp",
        "order": 7
    },
    {
        "name": "Side Dishes",
        "description": "Mac & cheese, cheesy baked potatoes, cajun wedges, mexican rice, and crispy fries.",
        "image": "/uploads/processed/cajun-potato-wedges.webp",
        "order": 8
    },
    {
        "name": "Beverages",
        "description": "Craft fruit mojitos, sparkling Kinza refreshers, fresh juices, and specialty iced teas.",
        "image": "/uploads/processed/blueberry-mojito.webp",
        "order": 9
    },
    {
        "name": "Sauces",
        "description": "House-made artisanal sauces, creamy mushroom truffle, chimichurri, cowboy butter, and dips.",
        "image": "/uploads/processed/entrecote-sauce.webp",
        "order": 10
    },
    {
        "name": "Desserts",
        "description": "Indulgent sweet treats, golden caramelized banana pudding, and protein energy bites.",
        "image": "/uploads/processed/homemade-onion-rings.webp",
        "order": 11
    }
]

def parse_nutrition(text):
    if not text:
        return {}
    res = {}
    m_cal = re.search(r'(\d+)\s*(?:kcal|calories)', text, re.IGNORECASE)
    if m_cal:
        res['calories'] = int(m_cal.group(1))

    m_prot = re.search(r'(\d+(?:\.\d+)?)\s*g?\s*protein', text, re.IGNORECASE) or re.search(r'protein\s*:?\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if m_prot:
        res['protein'] = round(float(m_prot.group(1)))

    m_carb = re.search(r'(\d+(?:\.\d+)?)\s*g?\s*carb', text, re.IGNORECASE) or re.search(r'carb[s]?\s*:?\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if m_carb:
        res['carbs'] = round(float(m_carb.group(1)))

    m_fat = re.search(r'(\d+(?:\.\d+)?)\s*g?\s*fat', text, re.IGNORECASE) or re.search(r'fat\s*:?\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if m_fat:
        res['fat'] = round(float(m_fat.group(1)))

    return res

processed_items = []
used_slugs = set()

for idx, it in enumerate(items):
    name_en = it['name_en']
    base_slug = slugify(name_en)
    slug = base_slug
    counter = 1
    while slug in used_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    used_slugs.add(slug)

    category = it['category']
    price = it.get('price', 0)
    desc_en = it.get('description_en', '')
    desc_ar = it.get('description_ar', '')

    # Nutrition
    nut = parse_nutrition(it.get('nutritional_value', '') + ' ' + desc_en)

    # Options
    options = []
    # Doneness
    if it.get('doneness_options') or 'doneness' in it.get('doneness_rule', '').lower():
        options.append({
            "name": "Meat Doneness",
            "type": "single",
            "required": True,
            "choices": [
                { "label": "Rare", "extraPrice": 0 },
                { "label": "Medium Rare", "extraPrice": 0 },
                { "label": "Medium", "extraPrice": 0 },
                { "label": "Medium Well", "extraPrice": 0 },
                { "label": "Well Done", "extraPrice": 0 }
            ]
        })

    # Sides
    if it.get('side_dishes'):
        raw_sides = [s.strip() for s in it['side_dishes'].split(',') if s.strip()]
        if raw_sides:
            options.append({
                "name": "Side Choices",
                "type": "multiple",
                "required": False,
                "choices": [{ "label": s.replace('\n', ' ').strip(), "extraPrice": 0 } for s in raw_sides[:10]]
            })

    # Sauces
    if it.get('sauce_options'):
        raw_sauces = [s.strip() for s in it['sauce_options'].split(',') if s.strip()]
        if raw_sauces:
            options.append({
                "name": "Sauce Choices",
                "type": "multiple",
                "required": False,
                "choices": [{ "label": s.replace('\n', ' ').strip(), "extraPrice": 0 } for s in raw_sauces[:10]]
            })

    # Tags
    tags = []
    if category in ('New Additions', 'Wagyu Steaks & Burgers'):
        tags.append('featured')
    if category == 'Wagyu Steaks & Burgers' or 'wagyu' in name_en.lower():
        tags.append('wagyu')
    if category == 'Healthy Dishes':
        tags.append('healthy')
    if price >= 140:
        tags.append('premium')
    if category == 'New Additions':
        tags.append('new')

    # Images
    img = find_image(name_en, category)
    images = []
    if img:
        images.append({
            "url": img['url'],
            "thumbUrl": img['thumbUrl'],
            "alt": name_en
        })

    processed_items.append({
        "name": name_en,
        "name_ar": it.get('name_ar', ''),
        "slug": slug,
        "description": desc_en or f"Delicious authentic {name_en} prepared freshly with premium quality ingredients.",
        "category": category,
        "price": price,
        "images": images,
        "nutrition": nut,
        "tags": tags,
        "options": options,
        "isAvailable": True,
        "order": idx
    })

seed_payload = {
    "categories": CATEGORY_DEFS,
    "menuItems": processed_items
}

output_file = 'server/src/seed/master_seed_data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(seed_payload, f, ensure_ascii=False, indent=2)

print(f"Generated {output_file} with {len(CATEGORY_DEFS)} categories and {len(processed_items)} authentic items.")
items_with_img = sum(1 for x in processed_items if x['images'])
print(f"Items mapped with media assets: {items_with_img} / {len(processed_items)}")
