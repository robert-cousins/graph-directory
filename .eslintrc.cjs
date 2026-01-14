module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  settings: {
    next: {
      // The Next.js app root was relocated in Phase 4 Stage 2.
      // This keeps next-eslint rules working when running eslint from the repo root.
      rootDir: ["apps/plumbers/"],
    },
  },
};
