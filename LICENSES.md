# Third-Party Libraries and Licenses

This document lists all third-party libraries and extensions used in the Pacifier project along with their licenses.

## Summary

All libraries used in this project are licensed under permissive open-source licenses that allow commercial use:
- **MIT License**: Most libraries (highly permissive, allows commercial use, modification, distribution)
- **Apache 2.0**: TypeScript (permissive, similar to MIT with patent grant)

> [!IMPORTANT]
> All licenses used in this project are permissive and allow commercial use without requiring disclosure of your source code.

---

## Production Dependencies

### Framework & UI
| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **next** | 14.2.18 | MIT | React framework for production |
| **react** | 18.3.1 | MIT | UI library |
| **react-dom** | 18.3.1 | MIT | React DOM renderer |
| **lucide-react** | 0.554.0 | MIT | Icon library |

### Styling
| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **tailwindcss** | 3.4.17 | MIT | Utility-first CSS framework |
| **autoprefixer** | 10.4.22 | MIT | PostCSS plugin for vendor prefixes |
| **postcss** | 8.5.6 | MIT | CSS transformation tool |

### Backend & Database
| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **@supabase/supabase-js** | 2.81.1 | MIT | Supabase client library |
| **@supabase/ssr** | 0.7.0 | MIT | Supabase SSR utilities |
| **@supabase/auth-helpers-nextjs** | 0.10.0 | MIT | Supabase auth for Next.js |
| **@supabase/auth-helpers-react** | 0.5.0 | MIT | Supabase auth for React |

### Payment Processing
| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **square** | 43.2.0 | MIT | Square payment API SDK |

### Utilities
| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **html5-qrcode** | 2.3.8 | MIT | QR code scanning library |
| **jsbarcode** | 3.12.1 | MIT | Barcode generation library |
| **jspdf** | 3.0.4 | MIT | PDF generation library |
| **nodemailer** | 7.0.11 | MIT | Email sending library |
| **ngrok** | 5.0.0-beta.2 | MIT | Secure tunneling for webhooks |

---

## Development Dependencies

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| **typescript** | 5.9.3 | Apache 2.0 | TypeScript compiler |
| **eslint** | 8.57.1 | MIT | JavaScript linter |
| **eslint-config-next** | 14.2.18 | MIT | Next.js ESLint configuration |
| **@types/node** | 20.19.25 | MIT | TypeScript types for Node.js |
| **@types/react** | 18.3.27 | MIT | TypeScript types for React |
| **@types/react-dom** | 18.3.7 | MIT | TypeScript types for React DOM |
| **@types/nodemailer** | 7.0.4 | MIT | TypeScript types for Nodemailer |
| **@types/jsbarcode** | 3.11.4 | MIT | TypeScript types for JSBarcode |

---

## License Details

### MIT License
The MIT License is one of the most permissive and business-friendly open-source licenses. It allows you to:
- ✅ Use the software commercially
- ✅ Modify the software
- ✅ Distribute the software
- ✅ Use it in proprietary/closed-source projects
- ✅ Sublicense

**Requirements:**
- Include the original license and copyright notice when distributing

### Apache License 2.0
The Apache License 2.0 is also very permissive, similar to MIT, with additional patent protection. It allows you to:
- ✅ Use the software commercially
- ✅ Modify the software
- ✅ Distribute the software
- ✅ Use it in proprietary/closed-source projects
- ✅ Sublicense
- ✅ Explicit patent grant from contributors

**Requirements:**
- Include the original license and copyright notice
- State significant changes made to the code
- Include a NOTICE file if one exists in the original

---

## Compliance Notes

1. **No Copyleft Licenses**: None of the libraries use copyleft licenses (like GPL) that would require you to open-source your own code.

2. **Attribution**: While MIT and Apache 2.0 don't require you to display attribution in your app's UI, you should keep license files in your codebase.

3. **Safe for Commercial Use**: All libraries are safe to use in commercial, proprietary software.

4. **Type Definitions**: The `@types/*` packages are all MIT licensed and used only for development (not distributed with your app).

---

## Recommended Actions

1. ✅ **Keep this file updated** when adding new dependencies
2. ✅ **Include license files** from dependencies in your distribution (they're already in `node_modules`)
3. ✅ **Review licenses** of any new packages before adding them to the project

To check licenses of a new package before installation:
```bash
npm view <package-name> license
```

To generate a fresh license report:
```bash
npx license-checker --summary
```

---

*Last updated: December 7, 2025*
