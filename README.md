# AFROTC Inventory Management System

A web-based uniform inventory and accountability system originally developed for AFROTC Detachment 055.

The application gives each cadet an individual inventory profile while providing Inventory Staff and Cadre with tools to manage, audit, and export uniform accountability data.

This repository contains the application source code, Supabase database schema, and reusable catalog data required to deploy an independent copy of the system.

> This application is an internal inventory/accountability tool. It does not replace WINGS or any other official Air Force or AFROTC system.

---

## Features

### Cadets

- Individual authenticated accounts
- Guided initial inventory setup
- View all currently issued uniform items
- Add additional existing items
- Update item size and quantity
- View personal inventory history
- Mobile-friendly interface

### Inventory Staff

- View all cadets and their inventory
- Search and filter cadets
- Add multiple items to a cadet at once
- Edit issued inventory
- Process inventory changes
- View global inventory activity
- Track changes through an audit log

### Inventory Administrators

- All Inventory Staff capabilities
- Manage user roles
- Manage cadet account status
- Convert accidental cadet accounts into Cadre accounts
- Download a complete application database backup
- Access WINGS translation tools

### Cadre

- Read-only access to cadet inventory
- View inventory history
- Access WINGS-ready inventory information
- View per-cadet WINGS exports
- No inventory modification permissions

### WINGS Support

The application maintains two layers of inventory data:

1. Physical inventory — what the cadet actually possesses
2. WINGS catalog mappings — known WINGS item information

Physical inventory is always preserved even when a matching WINGS item number is not currently known.

---

# Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
  - PostgreSQL
  - Authentication
  - Row Level Security
- Vercel

---

# Repository Structure

```text
app/                    Next.js application routes
components/             Shared React components
lib/                    Supabase and application utilities

supabase/
├── config.toml         Supabase local-development configuration
├── migrations/         Complete application database schema
└── seed.sql            Reusable catalog/reference data

.env.example            Required environment variable template
```

The repository intentionally does not contain operational cadet data.

The reusable database seed contains only system/reference information such as:

```text
roles
app_items
catalog_variants
wings_variants
catalog_variant_wings
```

It does not contain:

```text
profiles
cadets
profile_roles
cadet_inventory
inventory_events
Supabase Auth users
passwords
sessions
authentication tokens
```

---

# Requirements

Before deploying, install:

- Node.js
- npm
- Git
- Docker Desktop
- Supabase CLI access
- A Supabase account
- A Vercel account
- A GitHub account

Docker is required for Supabase local development and database reproducibility testing.

---

# 1. Create Your Repository

If this repository has been configured as a GitHub template:

1. Open the repository on GitHub.
2. Select **Use this template**.
3. Select **Create a new repository**.
4. Choose the GitHub organization or account that will own the new system.
5. Give the repository a name appropriate for your detachment.

Example:

```text
Det-XXX-Inventory
```

This creates an independent repository. Changes to one detachment's application will not automatically affect another detachment's copy.

Clone the new repository:

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_REPOSITORY_NAME
```

Install dependencies:

```bash
npm install
```

---

# 2. Create a Supabase Project

Create a new Supabase project for the detachment.

The Supabase project should be owned by a durable organizational account rather than an individual cadet whenever possible.

Record the following from the Supabase project settings:

```text
Project Reference
Project URL
Publishable Key
Database Password
```

Do not commit passwords, private keys, or service-role keys to GitHub.

---

# 3. Configure Environment Variables

Copy:

```text
.env.example
```

to:

```text
.env.local
```

Example:

```bash
cp .env.example .env.local
```

Configure:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

DET055_SIGNUP_CODE=
```

## Environment Variable Definitions

### `NEXT_PUBLIC_SUPABASE_URL`

The URL of the new Supabase project.

### `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The project's browser-safe Supabase publishable key.

Do not use a Supabase service-role key here.

### `NEXT_PUBLIC_SITE_URL`

For local development:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

After deployment, replace this with the production website:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### `DET055_SIGNUP_CODE`

Private access code required for account registration.

Example:

```env
DET055_SIGNUP_CODE=YOUR_PRIVATE_ACCESS_CODE
```

Do not commit the real signup code.

The environment-variable name retains the original Det 055 naming. Another detachment may leave this name unchanged or rename it throughout the source code.

---

# 4. Create the Database

Authenticate the Supabase CLI:

```bash
npx supabase login
```

Link the repository to the new Supabase project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Preview the migration:

```bash
npx supabase db push --dry-run
```

For a brand-new, empty Supabase project, deploy the schema and initial reference/catalog data:

```bash
npx supabase db push --include-seed
```

The included seed contains reusable catalog/reference records and no production cadet or authentication data.

Do not repeatedly use `--include-seed` against an established live database unless you understand the effect of the seed contents.

---

# 5. Verify the Database Locally

The repository has been tested so that a clean database can be reconstructed entirely from the committed migration and seed.

Start Supabase locally:

```bash
npx supabase start
```

Reset the local database:

```bash
npx supabase db reset
```

A successful reset should:

```text
Recreate the local database
Apply the migration
Load the catalog/reference seed
Restart Supabase services
```

You may inspect the local environment with:

```bash
npx supabase status
```

When finished:

```bash
npx supabase stop
```

---

# 6. Configure Supabase Authentication

Open the new Supabase project.

Go to:

```text
Authentication
→ URL Configuration
```

During local development, allow:

```text
http://localhost:3000/**
```

After deployment, configure the production site.

Example:

```text
Site URL:
https://your-production-domain.vercel.app
```

Add redirect URLs:

```text
https://your-production-domain.vercel.app/**
http://localhost:3000/**
```

The production Site URL must match the domain users actually use to access the application.

---

# 7. Configure Authentication Emails

The application contains routes for email confirmation and password recovery.

## Confirm Signup Template

In Supabase:

```text
Authentication
→ Email Templates
→ Confirm Signup
```

A compatible confirmation link is:

```html
<h2>Confirm your account</h2>

<p>
  Confirm your email address to finish creating your inventory account.
</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">
    Confirm email address
  </a>
</p>

<p>
  If you did not create this account, you can ignore this email.
</p>
```

## Password Recovery Template

In:

```text
Authentication
→ Email Templates
→ Reset Password
```

use a link compatible with:

```html
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password">
    Reset password
  </a>
</p>
```

Email confirmation should be tested before releasing the application to cadets.

---

# 8. Run the Application Locally

Start the Next.js development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Before deployment, verify:

```bash
npm run build
```

The production build should complete without TypeScript or route errors.

---

# 9. Create the First Inventory Administrator

Normal signup creates a cadet account.

Create the account that will become the first Inventory Administrator through the normal signup process.

After confirming the email, open the Supabase SQL Editor.

Replace the email below with the correct account:

```sql
insert into public.profile_roles (
  profile_id,
  role_id,
  assigned_by
)
select
  p.id,
  r.id,
  p.id
from public.profiles p
cross join public.roles r
where lower(p.email) = lower('YOUR_ADMIN_EMAIL')
  and r.name = 'inventory_admin'
on conflict (profile_id, role_id)
do nothing;
```

That account will now have Inventory Administrator privileges.

If the Inventory Administrator is also a cadet, no additional action is necessary.

---

# Optional: Create a Staff-Only Shared Inventory Account

Some detachments may want a shared organizational Inventory account that should not appear as a cadet.

Create the account normally and give it the `inventory_admin` role using the procedure above.

Before that account has any inventory or inventory history, its automatically created cadet record can be removed with the Supabase SQL Editor.

Replace the email:

```sql
delete from public.profile_roles pr
using public.roles r, public.profiles p
where pr.role_id = r.id
  and pr.profile_id = p.id
  and r.name = 'cadet'
  and lower(p.email) = lower('YOUR_SHARED_INVENTORY_EMAIL');

delete from public.cadets
where profile_id = (
  select id
  from public.profiles
  where lower(email) =
    lower('YOUR_SHARED_INVENTORY_EMAIL')
);
```

Do not use this process on a real cadet who already has inventory or audit history.

---

# 10. Deploy to Vercel

Import the GitHub repository into Vercel.

Configure these environment variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
DET055_SIGNUP_CODE=
```

Set:

```env
NEXT_PUBLIC_SITE_URL=https://YOUR_PRODUCTION_DOMAIN
```

Deploy the application.

Once the final Vercel domain is known, return to Supabase Authentication settings and ensure the Site URL and Redirect URLs use exactly that domain.

If the production URL changes later, update both:

```text
Vercel NEXT_PUBLIC_SITE_URL
Supabase Authentication Site URL / Redirect URLs
```

Then redeploy.

---

# 11. Production Validation

Before sending the site to the wing, test each major role.

## Cadet

Verify:

```text
Sign up
Email confirmation
Login
Initial inventory setup
View inventory
Bulk add items
Edit size/quantity
View inventory history
```

## Inventory Assistant

Verify:

```text
View cadet directory
Open cadet profiles
Add inventory
Edit inventory
View activity
Access WINGS inventory
```

## Inventory Administrator

Verify:

```text
All Inventory Assistant functions
Admin page
User role management
Cadet status management
Cadre conversion
Database backup download
```

## Cadre

Verify:

```text
View cadet inventory
View history
View WINGS data
View per-cadet WINGS export
Cannot modify inventory
```

---

# Roles

The application uses four primary roles.

## `cadet`

Can:

- View own inventory
- Add own existing inventory
- Edit own size and quantity
- View own history

Cannot:

- View other cadets
- Perform official inventory removal
- Administer users

## `inventory_assistant`

Can:

- View all cadets
- Add inventory
- Edit inventory
- Process inventory changes
- View global activity
- Access WINGS tools

Cannot:

- Manage users or system roles

## `inventory_admin`

Can:

- Perform all Inventory Assistant functions
- Manage roles
- Manage cadet account status
- Convert accounts to Cadre
- Download system backups
- Administer inventory operations

## `cadre`

Can:

- View all cadet inventory
- View history
- Access WINGS data
- Access per-cadet WINGS exports

Cannot:

- Modify cadet inventory

---

# Database Backups

Inventory Administrators can download a full application database backup from the Admin page.

The backup contains application database records including:

```text
profiles
cadets
profile_roles
cadet_inventory
inventory_events
app_items
catalog_variants
catalog_variant_wings
wings_variants
roles
```

Supabase authentication passwords and authentication secrets are not included.

Store periodic backups in a secure organizational location.

---

# WINGS Data

The repository contains the WINGS mappings known when this version of the application was published.

Another detachment should review the catalog and mappings before relying on them operationally.

The application intentionally follows this rule:

> Physical inventory reflects reality. WINGS mappings reflect what is currently known about WINGS.

An inventory item is not discarded simply because a WINGS mapping is unavailable.

Unknown WINGS fields remain blank.

The system should never invent a WINGS Item Number.

---

# Customizing for Another Detachment

The original application contains Det 055 branding.

To locate detachment-specific references, run:

```bash
grep -RniE \
'Det 055|DET055|Det055|det055' \
app components lib .env.example README.md \
--exclude-dir=.next
```

Review each result before changing it.

Typical customizations include:

```text
Detachment number/name
Signup access code
GitHub repository name
Supabase project
Vercel project
Production domain
Inventory Gmail / organizational account
WINGS catalog data
Uniform inventory catalog
Email wording
```

Do not point multiple detachments at the same Supabase project unless that is intentionally part of the system design.

Each independent deployment should normally have its own:

```text
GitHub repository
Supabase project
Vercel project
Signup access code
Backups
```

---

# Security

Never commit:

```text
.env.local
Database passwords
Supabase service-role keys
Authentication tokens
Signup access codes
User passwords
Production database dumps containing cadet information
```

The repository's `.gitignore` excludes local environment files and Supabase CLI temporary state.

Before publishing or sharing a repository, review:

```bash
git status

git ls-files | grep -E '\.env|secret|credential|key' || true
```

The publishable Supabase browser key is intended for client use. Database security must still be enforced with Row Level Security and application permissions.

---

# Database Development

Database schema changes should be represented as migrations.

Create a new migration:

```bash
npx supabase migration new DESCRIPTION
```

After editing it, test locally:

```bash
npx supabase db reset
```

Before deploying:

```bash
npx supabase db push --dry-run
```

Then deploy:

```bash
npx supabase db push
```

Do not make undocumented production-only schema changes if the repository is intended to remain reproducible.

---

# Application Development

Install packages:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Commit changes:

```bash
git add -A
git status
git commit -m "Describe your change"
git push
```

---

# Original Project

This system was originally developed for:

```text
AFROTC Detachment 055
University of California, Los Angeles
```

The original goal was to replace fragmented manual inventory tracking with a persistent cadet-centered inventory system that could be transferred between successive Inventory Officers.

The application remains an internal accountability tool and does not replace official Air Force inventory or personnel systems.