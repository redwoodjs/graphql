// Set the default webhook secret for all tests
process.env = Object.assign(process.env, {
  WEBHOOK_SECRET: 'MY_VOICE_IS_MY_PASSPORT_VERIFY_ME',
})
