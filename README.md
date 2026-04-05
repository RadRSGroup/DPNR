# DPNR Investor Pitch Website

A glass-morphic, single-page investor pitch website for DPNR's $3.5M Seed Round. Built with vanilla HTML, CSS, and JavaScript for maximum performance and simplicity.

## 🎯 Overview

This website transforms DPNR's comprehensive financial strategy document into an engaging, cinematic investor experience featuring:

- **Glass-morphic Design**: Frosted glass effects with dark theme
- **Responsive Layout**: Mobile-first design that works on all devices
- **Smooth Animations**: Scroll-triggered reveals and counter animations
- **Zero Dependencies**: No frameworks, no build process
- **Optimized Performance**: Fast loading, minimal JavaScript

## 📁 File Structure

```
.
├── index.html          # Main HTML structure
├── style.css           # All styling (glass effects, responsive design)
├── script.js           # JavaScript (animations, interactivity)
└── README.md           # This file
```

## 🚀 Quick Start

1. **Open Locally**
   ```bash
   open index.html
   ```
   Or simply double-click `index.html` in your file explorer.

2. **Use a Local Server** (recommended for best experience)
   ```bash
   # Python 3
   python -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000

   # Node.js (npx)
   npx serve

   # PHP
   php -S localhost:8000
   ```
   Then visit `http://localhost:8000`

## 🌐 Deployment

### Netlify (Recommended)

1. Sign up at [netlify.com](https://netlify.com)
2. Drag and drop the folder into Netlify's deploy interface
3. Done! Your site is live.

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

### GitHub Pages

1. Create a new GitHub repository
2. Push your code to the repository
3. Go to Settings → Pages
4. Select your branch and save
5. Your site will be live at `https://yourusername.github.io/repo-name`

### Traditional Hosting

Upload all files via FTP/SFTP to any web hosting service:
- Bluehost
- SiteGround
- HostGator
- Any static hosting provider

## 🎨 Customization Guide

### Colors

Edit CSS variables in `style.css` (lines 8-17):

```css
:root {
    --bg-primary: #0a0e27;          /* Main background */
    --bg-secondary: #1a1f3a;        /* Section backgrounds */
    --accent-primary: #6366f1;      /* Primary accent (indigo) */
    --accent-secondary: #8b5cf6;    /* Secondary accent (purple) */
    --accent-gold: #fbbf24;         /* Gold highlights */
    --text-primary: #f8fafc;        /* Main text */
    --text-secondary: #cbd5e1;      /* Secondary text */
    --glass-bg: rgba(255, 255, 255, 0.05);
    --glass-border: rgba(255, 255, 255, 0.1);
}
```

### Content

Edit `index.html` to update:
- Company information
- Financial metrics
- Team details
- Contact information
- Pricing tiers
- Milestones

### Typography

To use a custom font (e.g., Inter from Google Fonts):

1. Add to `<head>` in `index.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
   ```

2. Update `style.css`:
   ```css
   --font-base: 'Inter', sans-serif;
   --font-display: 'Inter', sans-serif;
   ```

### Images & Logos

To add a logo:

1. Create an `assets/` folder
2. Add your logo file (e.g., `logo.png`)
3. Update the navigation logo in `index.html`:
   ```html
   <div class="nav-logo">
       <img src="assets/logo.png" alt="DPNR" height="40">
   </div>
   ```

### Contact Information

Update email addresses in the CTA section (near line 720 in `index.html`):

```html
<a href="mailto:your-email@dpnr.com" class="btn btn-primary">Request Full Deck</a>
<a href="mailto:contact@dpnr.com" class="btn btn-secondary">Schedule Meeting</a>
```

## 📊 Key Sections

1. **Hero** - Investment summary and key metrics
2. **Vision** - Company philosophy and mission
3. **Problem** - Market gap and opportunity
4. **Solution** - Digital Twin platform features
5. **Business Model** - Pricing tiers and strategy
6. **Financials** - Projections, metrics, and milestones
7. **Use of Funds** - Capital allocation breakdown
8. **Roadmap** - 18-month execution plan
9. **The Ask** - Investment opportunity CTA
10. **Footer** - Legal and contact info

## ⚡ Performance

- **File Size**: ~80KB total (uncompressed)
- **Load Time**: < 1.5s on 4G
- **Lighthouse Score**: 95+ (expected)
- **Zero Dependencies**: No external libraries

## 🔧 Advanced Customization

### Add Analytics

Add before closing `</head>` tag in `index.html`:

**Google Analytics:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**Plausible Analytics (Privacy-Friendly):**
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

### Add Email Capture

Replace the CTA buttons with a form:

```html
<form action="your-email-service-url" method="POST">
    <input type="email" name="email" placeholder="investor@email.com" required>
    <button type="submit" class="btn btn-primary">Request Deck</button>
</form>
```

Services: Mailchimp, ConvertKit, Formspree, Netlify Forms

### Interactive Charts

To add Chart.js for interactive charts:

1. Add before `</body>`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
   ```

2. Create a canvas element:
   ```html
   <canvas id="revenueChart"></canvas>
   ```

3. Add chart configuration in `script.js`

## 🎯 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 13+
- Mobile browsers (iOS Safari, Chrome Android)

**Note**: `backdrop-filter` (glass effect) requires modern browsers. Fallback styles are included for older browsers.

## 📱 Mobile Optimization

The site is fully responsive with breakpoints at:
- **640px**: Mobile phones
- **768px**: Tablets
- **1024px**: Small laptops
- **1280px**: Desktops

Test on multiple devices or use browser dev tools (Cmd/Ctrl + Shift + M).

## 🔒 Security & Privacy

- No cookies or tracking by default
- No external dependencies (except optional analytics)
- All assets can be self-hosted
- HTTPS recommended for production

## 🐛 Troubleshooting

**Glass effects not working:**
- Check browser support for `backdrop-filter`
- Use a modern browser (Chrome, Firefox, Safari 13+)

**Animations not triggering:**
- Ensure JavaScript is enabled
- Check browser console for errors
- Verify Intersection Observer support

**Layout broken on mobile:**
- Clear browser cache
- Check viewport meta tag in HTML
- Test in browser dev tools

## 📈 SEO Optimization

Update meta tags in `<head>` (index.html):

```html
<title>DPNR - Seed Investment Deck ($3.5M)</title>
<meta name="description" content="...">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://yoursite.com/preview.jpg">
<meta name="twitter:card" content="summary_large_image">
```

## 🎨 Design System

### Glass-Morphic Effect
```css
.glass-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}
```

### Gradient Text
```css
.gradient-text {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

## 📝 Content Guidelines

**Tone**: Professional yet visionary, data-driven but emotionally resonant

**Key Messages**:
1. First-to-market Digital Twin platform
2. Capital-efficient growth (7.1x LTV/CAC)
3. Content-led acquisition strategy
4. Series A-ready in 18 months

## 🚀 Future Enhancements

Potential additions for v2.0:
- [ ] Video background
- [ ] Interactive 3D elements (Three.js)
- [ ] Advanced chart library integration
- [ ] Email capture form
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Downloadable pitch deck PDF

## 📄 License

This is a proprietary investment pitch website for DPNR LTD. All rights reserved.

## 🤝 Support

For customization help or technical support:
- Email: dev@dpnr.com
- Issues: Create an issue if this is in a GitHub repo

## 🎉 Credits

Built with:
- **HTML5** - Structure
- **CSS3** - Glass-morphic styling, animations
- **Vanilla JavaScript** - Smooth interactions
- **Love** - Attention to detail

---

**Ready to deploy?** Just upload the files to any static hosting service and share the link with investors. No build process, no dependencies, no hassle.

**Questions?** Check the customization guide above or reach out to the development team.

---

*This website was designed to showcase DPNR's $3.5M Seed Round investment opportunity through a modern, engaging, and professional digital experience.*
