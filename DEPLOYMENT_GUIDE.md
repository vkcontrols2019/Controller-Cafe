# VK CONTROLS - Web Hosting & Deployment Guide

This application is built as a modern, high-performance static web application using HTML5, Vanilla CSS, and ES Modules with browser `localStorage` persistence.

> **Zero Build Steps Required**: You do **not** need `npm run build`, Webpack, or Node.js compilers to host this app. All files (`index.html`, `css/`, `js/`) are production-ready and can be hosted directly on any web server, cloud bucket, or CDN.

---

## 🚀 Option 1: 30-Second Drag & Drop Hosting (Netlify Drop)
*Best for: Instant public HTTPS URL with zero terminal commands, completely free.*

1. Open your browser and navigate to: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Sign in or continue as guest.
3. Drag the entire **`Project Vk`** folder and drop it onto the browser window.
4. Netlify will deploy it in under 5 seconds and give you a live public HTTPS link (e.g., `https://vk-controls-xyz.netlify.app`).
5. *(Optional)* You can change the site name or connect your company's custom domain for free under **Site Settings > Domain management**.

---

## 🌐 Option 2: GitHub Pages (Free & Permanent)
*Best for: Long-term hosting with version control and free custom domain support.*

1. Go to **[GitHub.com](https://github.com)** and create a new repository (e.g. `vk-controls`).
2. Upload the files (`index.html`, `css`, `js`) or push using git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - VK CONTROLS"
   git branch -M main
   git remote add origin https://github.com/<your-username>/craftmatrix-pro.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Click **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment > Branch**, select `main` and root folder `/` -> Click **Save**.
4. Your website is live at: `https://<your-username>.github.io/craftmatrix-pro/`

---

## ☁️ Option 3: Google Cloud Storage (GCS) Static Web Hosting
*Best for: Enterprise Google Cloud infrastructure with custom domain and Cloud CDN.*

1. Open **Google Cloud Shell** or your terminal with `gcloud` installed:
2. Create a bucket (named after your domain, e.g. `app.yourcompany.com`):
   ```bash
   gcloud storage buckets create gs://app.yourcompany.com --location=us-central1
   ```
3. Upload all project files:
   ```bash
   gcloud storage rsync -r ./ gs://app.yourcompany.com
   ```
4. Make the bucket publicly accessible:
   ```bash
   gcloud storage buckets add-iam-policy-binding gs://app.yourcompany.com \
       --member=allUsers \
       --role=roles/storage.objectViewer
   ```
5. Configure static website endpoints:
   ```bash
   gcloud storage buckets update gs://app.yourcompany.com --web-main-page-suffix=index.html --web-error-page=index.html
   ```

---

## ☁️ Option 4: AWS S3 + CloudFront CDN
*Best for: AWS environments with global CDN caching.*

1. In the **AWS Management Console**, go to **Amazon S3** > **Create bucket**.
2. Uncheck **Block all public access** and acknowledge the setting.
3. Under **Properties** > **Static website hosting**, choose **Enable**:
   - Index document: `index.html`
   - Error document: `index.html`
4. Under **Permissions** > **Bucket Policy**, paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```
5. Upload all files from `Project Vk` into the bucket.
6. *(Optional)* Create an **AWS CloudFront** distribution pointing to your S3 bucket to get free HTTPS and custom domain SSL.

---

## 🏢 Option 5: Office PC / Local Area Network (LAN) Hosting
*Best for: Running on your office computer so other tablets, POS terminals, and phones on the office Wi-Fi can access it.*

### Method A: Using the included PowerShell server (`server.ps1`)
1. On your office PC, open PowerShell in the `Project Vk` folder:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\server.ps1
   ```
2. Find your Office PC's local IP address:
   ```powershell
   ipconfig
   ```
   *(Look for IPv4 Address, e.g. `192.168.1.50`)*
3. Any device on the same office Wi-Fi can now open:
   `http://192.168.1.50:8080`

### Method B: Using Python (if installed on office PC)
```bash
python -m http.server 8080 --bind 0.0.0.0
```

### Method C: Using Node.js (if installed on office PC)
```bash
npx serve . -p 8080
```

### Method D: Windows IIS (Internet Information Services)
1. Turn on **Internet Information Services** in Windows Features.
2. In IIS Manager, add a new Website.
3. Set Physical Path to `C:\path\to\Project Vk` and assign port 80 or 8080.

---

## 📁 Files Included in Deployment Package
- `index.html`: Main single-page application shell, navigation, modals, and templates.
- `css/`: Theme variables, layout, components, typography, print styles.
- `js/store/db.js`: Local database with Item Master, Sub-Recipes, Recipe Cards, Menu Master, seed data, and transaction auditing.
- `js/modules/`:
  - `inventory.js`: Item Master catalog, units, where-used explorer, bottle tenths slider.
  - `subrecipes.js`: Sub-Recipe Master, batch yield costing, Cook/Prep batch depletion.
  - `recipes.js`: Recipe Card Studio, portion costing, allergen tags, printable kitchen spec sheets.
  - `menumaster.js`: Menu Master, modifier manager, 86'd inventory availability, BCG matrix.
  - `pos.js`: Live sales terminal with multi-tier BOM depletion.
  - `brewhouse.js`, `taproom.js`, `analytics.js`, `audit.js`, `commandPalette.js`, `settings.js`.
- `server.ps1`: Portable, standalone local/LAN web server.
