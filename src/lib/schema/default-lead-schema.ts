import type { FormSchema } from './types';

/**
 * Default lead-capture schema for a textile wholesaler. This is a sensible
 * starting point the admin can edit (add/remove fields, change options) without
 * touching code — it is data, not logic.
 */
export const defaultLeadSchema: FormSchema = {
  version: 1,
  entity: 'lead',
  fields: [
    {
      key: 'name',
      type: 'text',
      required: true,
      label: { en: 'Full name', hi: 'पूरा नाम', gu: 'પૂરું નામ' },
      placeholder: { en: 'e.g. Ramesh Patel', hi: 'जैसे रमेश पटेल', gu: 'દા.ત. રમેશ પટેલ' },
      validation: { maxLen: 80 },
    },
    {
      key: 'phone',
      type: 'phone',
      required: true,
      label: { en: 'Phone number', hi: 'फ़ोन नंबर', gu: 'ફોન નંબર' },
      placeholder: { en: '+91 98765 43210', hi: '+91 98765 43210', gu: '+91 98765 43210' },
    },
    {
      key: 'email',
      type: 'email',
      label: { en: 'Email', hi: 'ईमेल', gu: 'ઈમેલ' },
      llm: { hint: { en: 'Optional; only if clearly stated.', hi: 'वैकल्पिक', gu: 'વૈકલ્પિક' } },
    },
    {
      key: 'company',
      type: 'text',
      label: { en: 'Company / shop name', hi: 'कंपनी / दुकान का नाम', gu: 'કંપની / દુકાનનું નામ' },
      validation: { maxLen: 120 },
    },
    {
      key: 'city',
      type: 'text',
      label: { en: 'City', hi: 'शहर', gu: 'શહેર' },
      validation: { maxLen: 60 },
    },
    {
      key: 'interests',
      type: 'multi_select',
      required: true,
      label: { en: 'Interested in', hi: 'किसमें रुचि है', gu: 'શેમાં રસ છે' },
      llm: {
        hint: {
          en: 'Map the customer’s described interests to these product categories.',
          hi: 'ग्राहक की रुचि को इन श्रेणियों से मिलाएँ।',
          gu: 'ગ્રાહકના રસને આ શ્રેણીઓ સાથે મેળવો.',
        },
      },
      options: [
        { value: 'dress_materials', label: { en: 'Dress materials', hi: 'ड्रेस मटेरियल', gu: 'ડ્રેસ મટિરિયલ' } },
        { value: 'sarees', label: { en: 'Sarees', hi: 'साड़ी', gu: 'સાડી' } },
        { value: 'embroidery', label: { en: 'Embroidery', hi: 'कढ़ाई', gu: 'ભરતકામ' } },
        { value: 'other', label: { en: 'Other', hi: 'अन्य', gu: 'અન્ય' } },
      ],
    },
    {
      key: 'buyer_type',
      type: 'single_select',
      label: { en: 'Buyer type', hi: 'खरीदार का प्रकार', gu: 'ખરીદનારનો પ્રકાર' },
      options: [
        { value: 'wholesaler', label: { en: 'Wholesaler', hi: 'थोक विक्रेता', gu: 'જથ્થાબંધ વેપારી' } },
        { value: 'retailer', label: { en: 'Retailer', hi: 'खुदरा विक्रेता', gu: 'છૂટક વેપારી' } },
        { value: 'boutique', label: { en: 'Boutique', hi: 'बुटीक', gu: 'બુટિક' } },
        { value: 'individual', label: { en: 'Individual', hi: 'व्यक्तिगत', gu: 'વ્યક્તિગત' } },
      ],
    },
    {
      key: 'notes',
      type: 'free_text',
      label: { en: 'Notes', hi: 'टिप्पणियाँ', gu: 'નોંધ' },
      placeholder: {
        en: 'Anything they said — designs, quantity, follow-up date…',
        hi: 'जो भी कहा — डिज़ाइन, मात्रा, फॉलो-अप तारीख…',
        gu: 'જે કહ્યું — ડિઝાઇન, જથ્થો, ફોલો-અપ તારીખ…',
      },
      validation: { maxLen: 2000 },
    },
  ],
};
