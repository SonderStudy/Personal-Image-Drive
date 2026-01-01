
module.exports = {
  apps: [{
    name: "lumina-drive",
    script: "./server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3003
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
