/**
 * Presets for Option Groups in the Admin Menu Form.
 */

export const MEAT_DONENESS_PRESET = Object.freeze({
  name: 'Meat Doneness',
  nameAr: 'درجة استواء اللحم',
  type: 'single',
  groupType: 'text',
  maxSelections: 1,
  required: true,
  choices: Object.freeze([
    Object.freeze({ label: 'Rare', labelAr: 'رير', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Medium Rare', labelAr: 'ميديوم رير', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Medium', labelAr: 'ميديوم', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Medium Well', labelAr: 'ميديوم ويل', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Well Done', labelAr: 'ويل دن', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
  ]),
});

export const SIDE_CHOICES_PRESET = Object.freeze({
  name: 'Side Choices',
  nameAr: 'اختيارات الأطباق الجانبية',
  type: 'multiple',
  groupType: 'photo',
  maxSelections: 2,
  required: false,
  choices: Object.freeze([
    Object.freeze({ label: 'Mac & Cheese', labelAr: 'ماك أند تشيز', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Shredded corn w/cheetos', labelAr: 'ذرة مشوية بالشيتوس', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Mashed potatoes', labelAr: 'بطاطس مهروسة', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Mexican rice', labelAr: 'أرز مكسيكي', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Sauteed vegetables', labelAr: 'خضار سوتيه', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Sweet fries', labelAr: 'بطاطا حلوة مقلية', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Cajun potato wedges', labelAr: 'بطاطس ويدجز كاجون', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Cheesy baked potato', labelAr: 'بطاطس مشوية بالجبنة', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Side salad', labelAr: 'سلطة جانبية', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Shredded corn', labelAr: 'ذرة مشوية', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
  ]),
});

export const SAUCE_CHOICES_PRESET = Object.freeze({
  name: 'Sauce Choices',
  nameAr: 'اختيارات الصلصات',
  type: 'multiple',
  groupType: 'photo',
  maxSelections: 2,
  required: false,
  choices: Object.freeze([
    Object.freeze({ label: 'Entrecote', labelAr: 'أنتركوت', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Chimichuri', labelAr: 'تشيميتشوري', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Cowboy', labelAr: 'كاوبوي', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Lemon pepper', labelAr: 'الليمون والفلفل', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Mushroom & truffle', labelAr: 'الفطر والكمأة', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Bbq', labelAr: 'باربكيو', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Spicy honey bbq', labelAr: 'باربكيو بالعسل الحار', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Marinara', labelAr: 'مارينارا', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Lemon & herbs', labelAr: 'الليمون والأعشاب', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
    Object.freeze({ label: 'Nacho cheese', labelAr: 'جبنة ناتشوز', extraPrice: 0, image: Object.freeze({ url: '', thumbUrl: '' }), libraryItemId: null }),
  ]),
});

function cloneGroupPreset(preset) {
  return {
    name: preset.name,
    nameAr: preset.nameAr,
    type: preset.type,
    groupType: preset.groupType,
    maxSelections: preset.maxSelections,
    required: preset.required,
    choices: preset.choices.map((c) => ({
      label: c.label,
      labelAr: c.labelAr,
      extraPrice: c.extraPrice,
      image: { url: c.image.url, thumbUrl: c.image.thumbUrl },
      libraryItemId: c.libraryItemId,
    })),
  };
}

/**
 * Returns a completely fresh deep clone of MEAT_DONENESS_PRESET
 * with unique object references for all nested properties.
 */
export function getMeatDonenessPresetClone() {
  return cloneGroupPreset(MEAT_DONENESS_PRESET);
}

/**
 * Returns a completely fresh deep clone of SIDE_CHOICES_PRESET
 * with unique object references for all nested properties.
 */
export function getSideChoicesPresetClone() {
  return cloneGroupPreset(SIDE_CHOICES_PRESET);
}

/**
 * Returns a completely fresh deep clone of SAUCE_CHOICES_PRESET
 * with unique object references for all nested properties.
 */
export function getSauceChoicesPresetClone() {
  return cloneGroupPreset(SAUCE_CHOICES_PRESET);
}

/**
 * Returns the 3 standard option groups in exact order:
 * 1. Meat Doneness
 * 2. Side Choices
 * 3. Sauce Choices
 */
export function getStandardOptionGroups() {
  return [
    getMeatDonenessPresetClone(),
    getSideChoicesPresetClone(),
    getSauceChoicesPresetClone(),
  ];
}
