// Sentry's wrapper around Expo's default Metro config. It injects debug IDs
// into bundles so stack traces symbolicate once sourcemaps are uploaded.
// With no Sentry DSN configured this behaves like the stock Expo config.
const { getSentryExpoConfig } = require('@sentry/react-native/metro')

module.exports = getSentryExpoConfig(__dirname)
