# PRP: Landing Page Implementation

## Feature Overview
Implement a comprehensive landing page for the DPNR Course Platform that showcases course offerings, features, and calls-to-action without 3D components.

## Context for AI Agent

### Project Structure
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS (violet color scheme)
- **UI Components**: Custom components in `components/ui/`
- **Main Landing Page**: `/apps/web/app/page.tsx`

### Existing Patterns to Follow

#### Page Structure Pattern (from existing pages)
```tsx
export default function Page() {
  return (
    <main className="[appropriate-container-class]">
      {/* Content sections */}
    </main>
  );
}
```

#### Container Width Classes
- Full width hero: `w-full`
- Content sections: `max-w-4xl mx-auto`
- Feature cards: `max-w-5xl mx-auto`

#### Typography Patterns
- H1: `text-3xl font-bold` or `text-2xl font-semibold`
- H2: `text-2xl font-semibold mb-3`
- Body: Default or `text-gray-700`
- Small text: `text-sm text-gray-600`

#### Color Scheme
- Primary: `violet-600`, `violet-700` (hover)
- Background: `violet-100` (light)
- Text: `gray-900` (primary), `gray-700` (secondary)

### Available Components

#### From `/components/ui/`:
- **Button**: Use with variants `default`, `outline`, `ghost`
- **Input**: Form inputs with violet focus ring
- **Label**: Form labels
- **Checkbox**: For consent/agreement

#### Custom Components:
- **Header**: Already included in layout
- **YouTube**: For embedding course preview videos

### Required Sections

Based on PRD and existing implementation:

1. **Hero Section**
   - Compelling headline and subheadline
   - Clear value proposition
   - Primary CTA buttons (Register, Learn More)
   - Visual appeal without 3D

2. **Features Section**
   - Course highlights
   - Platform benefits
   - Learning methodology

3. **Course Overview**
   - Course categories
   - Upcoming sessions
   - Instructor information

4. **Video Preview**
   - Sample course content
   - YouTube embed with privacy mode

5. **Testimonials/Social Proof**
   - Student success stories
   - Course statistics

6. **Call-to-Action**
   - Registration prompt
   - Contact information

## Implementation Blueprint

### Step 1: Hero Section
```tsx
// Hero with gradient background and centered content
<section className="relative w-full min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
  <div className="text-center px-8 max-w-4xl">
    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
      Master Development with DPNR Courses
    </h1>
    <p className="text-xl text-gray-700 mb-8">
      In-person courses designed for practical, hands-on learning
    </p>
    <div className="flex gap-4 justify-center">
      <Button variant="default">Start Learning</Button>
      <Button variant="outline">View Courses</Button>
    </div>
  </div>
</section>
```

### Step 2: Features Grid
```tsx
// Three-column feature grid
<section className="py-16 px-8">
  <div className="max-w-5xl mx-auto">
    <h2 className="text-2xl font-semibold text-center mb-12">Why Choose DPNR?</h2>
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((feature) => (
        <div key={feature.id} className="rounded-lg border p-6">
          <h3 className="font-medium mb-2">{feature.title}</h3>
          <p className="text-sm text-gray-600">{feature.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Step 3: Course Preview
```tsx
// Course cards with enrollment CTA
<section className="py-16 px-8 bg-gray-50">
  <div className="max-w-5xl mx-auto">
    <h2 className="text-2xl font-semibold text-center mb-12">Upcoming Courses</h2>
    <div className="grid gap-8 md:grid-cols-2">
      {courses.map((course) => (
        <div key={course.id} className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
          <p className="text-gray-700 mb-4">{course.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-violet-600 font-medium">${course.price}</span>
            <Button variant="default" size="sm">Enroll Now</Button>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Step 4: Video Section
```tsx
// Embedded course preview video
<section className="py-16 px-8">
  <div className="max-w-4xl mx-auto">
    <h2 className="text-2xl font-semibold text-center mb-8">See DPNR in Action</h2>
    <YouTube videoId="sample-video-id" title="DPNR Course Preview" />
  </div>
</section>
```

### Step 5: Final CTA
```tsx
// Bottom call-to-action
<section className="py-16 px-8 bg-violet-600 text-white">
  <div className="max-w-3xl mx-auto text-center">
    <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
    <p className="text-lg mb-8 opacity-90">
      Join hundreds of students advancing their careers with DPNR
    </p>
    <Button variant="outline" className="bg-white text-violet-600 hover:bg-gray-50">
      Get Started Today
    </Button>
  </div>
</section>
```

## File Structure

```
/apps/web/app/
├── page.tsx (modify existing)
└── components/
    └── landing/
        ├── HeroSection.tsx
        ├── FeaturesGrid.tsx
        ├── CoursePreview.tsx
        ├── VideoSection.tsx
        └── CTASection.tsx
```

## Data Requirements

### Static Data (can be hardcoded initially)
```typescript
const features = [
  {
    id: 1,
    title: "Expert Instructors",
    description: "Learn from industry professionals with real-world experience"
  },
  {
    id: 2,
    title: "Hands-On Learning",
    description: "Practice with real projects and immediate feedback"
  },
  {
    id: 3,
    title: "Small Class Sizes",
    description: "Personalized attention in intimate learning environments"
  }
];

const courses = [
  {
    id: 1,
    title: "Full-Stack Development",
    description: "Master modern web development from front to back",
    price: 299,
    startDate: "2024-02-01"
  },
  {
    id: 2,
    title: "React Advanced Patterns",
    description: "Deep dive into React architecture and best practices",
    price: 199,
    startDate: "2024-02-15"
  }
];
```

## Implementation Tasks

1. **Create Hero Section Component**
   - Gradient background
   - Responsive typography
   - CTA buttons with proper routing

2. **Build Features Grid**
   - Responsive 3-column layout
   - Card components with consistent styling
   - Icon placeholders (can use Lucide icons)

3. **Implement Course Preview**
   - Fetch courses from database (or use static data)
   - Course cards with enrollment buttons
   - Price display and date formatting

4. **Add Video Section**
   - Integrate YouTube component
   - Responsive video container
   - Fallback for loading state

5. **Create Final CTA**
   - High-contrast section
   - Clear action buttons
   - Link to registration

6. **Mobile Optimization**
   - Test all breakpoints
   - Ensure touch-friendly buttons
   - Verify text readability

7. **Performance Optimization**
   - Lazy load video component
   - Optimize images if added
   - Check Lighthouse scores

## Validation Gates

```bash
# 1. Syntax and Type Checking
cd dpnr-course-platform
npm run lint

# 2. Build Verification
npm run build

# 3. Development Server Test
npm run dev
# Navigate to http://localhost:3000
# Verify all sections render correctly

# 4. Responsive Design Check
# Test at breakpoints: 375px, 768px, 1024px, 1440px

# 5. Accessibility Check
# Verify keyboard navigation works
# Check color contrast ratios
# Ensure all interactive elements have proper labels

# 6. Performance Check
# Lighthouse score should be:
# - Performance: > 90
# - Accessibility: > 95
# - Best Practices: > 90
# - SEO: > 90
```

## Error Handling Strategy

1. **Data Fetching**
   - Use try-catch blocks for API calls
   - Provide fallback UI for loading states
   - Show user-friendly error messages

2. **Navigation**
   - Verify all links work correctly
   - Handle 404 cases gracefully
   - Ensure back button works as expected

3. **Form Submissions**
   - Validate inputs before submission
   - Show loading states during processing
   - Display success/error feedback

## Dependencies

### Required Packages (already installed)
- next: 15.0.0
- react: 19.0.0
- tailwindcss: 3.4.7
- @radix-ui components
- lucide-react: 0.441.0

### Environment Variables Needed
```env
NEXT_PUBLIC_URL=http://localhost:3000
# Add YouTube video ID when available
NEXT_PUBLIC_DEMO_VIDEO_ID=your-video-id
```

## Testing Checklist

- [ ] Hero section displays correctly
- [ ] All buttons have proper hover states
- [ ] Features grid is responsive
- [ ] Course cards show correct information
- [ ] Video embed works (when ID provided)
- [ ] CTA section is visible and clickable
- [ ] Mobile menu works (if applicable)
- [ ] Page loads under 3 seconds
- [ ] No console errors
- [ ] All links functional

## References

### Documentation
- Next.js App Router: https://nextjs.org/docs/app
- Tailwind CSS: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/docs/primitives
- Lucide Icons: https://lucide.dev/icons/

### Existing Files to Reference
- Layout: `/apps/web/app/layout.tsx`
- Button Component: `/apps/web/components/ui/button.tsx`
- YouTube Component: `/apps/web/components/YouTube.tsx`
- Auth Pages: `/apps/web/app/auth/login/page.tsx` (for form patterns)

## Success Metrics

**Confidence Level: 9/10**

This PRP provides comprehensive context for implementing a landing page that:
- Follows existing codebase patterns
- Uses available components
- Maintains design consistency
- Is fully responsive
- Includes clear validation steps
- Has executable testing commands

The implementation should succeed in one pass with these detailed specifications and references to existing code patterns.