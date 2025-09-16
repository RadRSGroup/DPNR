# Hebrew Localization Guide for DPNR Course Platform

## Overview
This guide provides Hebrew translations and RTL implementation recommendations for the DPNR Course Platform marketing components.

## Translation Files Created
1. **hebrew.json** - Structured translations organized by component/section
2. **text-mappings.he.json** - Direct mapping of English strings to Hebrew translations

## Key Translation Decisions

### Brand and Course Names
- **DPNR**: Kept as-is (proper noun/brand name)
- Course titles and technical terms maintain consistency with brand identity

### Cultural Adaptations
- Names in testimonials (Dana, Eli, Noa) are already Hebrew-appropriate
- "Learner" translated as "לומד" (gender-neutral where possible)
- Time references and dates will use Hebrew formatting when displayed

### Tone and Style
- Professional yet accessible Hebrew
- Modern Israeli Hebrew usage
- Consistent terminology across all components

## RTL Implementation Considerations

### CSS Changes Required
```css
/* Add to global styles for Hebrew pages */
html[lang="he"] {
  direction: rtl;
}

/* Adjust grid layouts for RTL */
html[lang="he"] .hero-grid {
  direction: rtl;
}

/* Mirror padding/margins where needed */
html[lang="he"] .text-left {
  text-align: right;
}

html[lang="he"] .text-right {
  text-align: left;
}
```

### Component-Specific Adjustments

#### Hero Component
- Text alignment should be right-aligned for Hebrew
- Button order may need adjustment in RTL layout
- Image positioning remains the same

#### Courses Grid
- Card layouts work well in RTL
- Date formatting should use Hebrew locale
- Consider Hebrew number formatting

#### Testimonials
- Quote marks positioning needs RTL adjustment
- Avatar positioning remains left-aligned
- Text flows naturally in RTL

#### Shop Strip
- Product grid works well in RTL
- Image positioning remains the same
- Text alignment within cards needs RTL adjustment

## Implementation Strategy

### Option 1: Separate Hebrew Pages
- Create `/he/` directory structure
- Duplicate components with Hebrew translations
- Add language switcher in navigation

### Option 2: Internationalization (i18n)
- Implement Next.js i18n support
- Use translation keys in components
- Dynamic language switching

### Option 3: Content Management
- Store translations in database/CMS
- Dynamic content loading based on locale
- Admin interface for translation management

## Font Recommendations

### Primary Hebrew Fonts
1. **Noto Sans Hebrew** - Excellent Hebrew support, modern
2. **Arial** - Universal compatibility
3. **Tahoma** - Good fallback option

### Font Stack Suggestion
```css
font-family: "Noto Sans Hebrew", Arial, Tahoma, sans-serif;
```

## Technical Implementation Notes

### HTML Attributes
```html
<html lang="he" dir="rtl">
```

### Meta Tags for Hebrew Pages
```html
<meta name="language" content="Hebrew">
<meta name="author" content="DPNR Course Platform">
```

### Date and Number Formatting
- Use Hebrew locale formatting: `new Date().toLocaleDateString('he-IL')`
- Consider Hebrew numerals for appropriate contexts

## Content Validation Checklist

- [ ] All user-visible text translated
- [ ] Cultural references adapted appropriately
- [ ] Gender-neutral language where applicable
- [ ] Consistent terminology across components
- [ ] Alt text for images translated
- [ ] Form labels and placeholders translated
- [ ] Error messages translated
- [ ] Navigation elements translated

## Future Considerations

### Additional Translation Needs
- Form validation messages
- Loading states and error messages
- Email templates
- API response messages
- SEO meta descriptions and titles

### Accessibility
- Ensure screen readers work properly with Hebrew text
- Keyboard navigation works in RTL layout
- High contrast support maintained

## Testing Recommendations

1. **Visual Testing**
   - Test all layouts in RTL mode
   - Verify text doesn't overflow containers
   - Check button and link positioning

2. **Functional Testing**
   - Test all interactive elements
   - Verify form submissions work
   - Check navigation flow

3. **Content Testing**
   - Native Hebrew speaker review
   - Technical terminology accuracy
   - Cultural appropriateness validation

## Files Modified in Analysis
- `/apps/web/app/new/page.tsx` - Main landing page
- `/apps/web/components/marketing/CoursesGrid.tsx` - Course display component
- `/apps/web/components/marketing/ShopStrip.tsx` - Product showcase component
- Referenced components: Hero.tsx, Testimonials.tsx

All user-facing strings from these components have been extracted and translated.