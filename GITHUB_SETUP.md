# GitHub Setup Guide

## Option 1: Using GitHub CLI (Recommended)

If you have GitHub CLI installed:

```bash
# Create repository and push
gh repo create hack-nation --public --source=. --remote=origin

# Add all files and commit
git add .
git commit -m "Initial commit: Hackathon starter kit"

# Push to GitHub
git push -u origin main
```

## Option 2: Manual Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Name your repository (e.g., "hack-nation" or your project name)
3. Choose Public or Private
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### Step 2: Connect and Push

```bash
# Add remote origin (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Hackathon starter kit"

# Push to GitHub
git branch -M main
git push -u origin main
```

## Setup GitHub Secrets for CI/CD

For GitHub Actions to work properly, add these secrets in your repository settings:

1. Go to Settings > Secrets and variables > Actions
2. Add the following secrets:
   - `NEXTAUTH_SECRET`: Your NextAuth secret
   - `DATABASE_URL`: Your production database URL (if deploying)

## Enable GitHub Actions

GitHub Actions will automatically run on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The workflow will:

- Run linting
- Check code formatting
- Perform type checking
- Build the application
- Build Docker image

## Deploying to Vercel from GitHub

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect Next.js configuration
4. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your Vercel URL)
5. Click "Deploy"

## Branch Protection (Optional but Recommended)

For team hackathons, set up branch protection:

1. Go to Settings > Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request before merging
   - Require status checks to pass (CI)

## Collaborating

Invite team members:

```bash
# Using GitHub CLI
gh repo invite USERNAME

# Or go to Settings > Collaborators in GitHub
```

## Quick Commands Reference

```bash
# Check git status
git status

# Create a new branch for a feature
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "Add: new feature"

# Push branch to GitHub
git push -u origin feature/my-feature

# Create pull request
gh pr create

# Update from main
git checkout main
git pull origin main
```

## Tips

- Commit early and often during the hackathon
- Use descriptive commit messages
- Create branches for major features
- Use pull requests for team review
- Tag your final submission: `git tag -a v1.0 -m "Hackathon submission"`
