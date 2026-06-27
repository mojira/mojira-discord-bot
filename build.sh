# Keep in sync with .github/workflows/push-build-deploy.yml

CI=true

echo "Install dependencies"
npm install --no-audit

echo "Compile to JavaScript"
npm run build

echo "Rebuild better-sqlite3"
npm rebuild better_sqlite3
npm rebuild

echo "Prune dependencies"
npm prune --production
