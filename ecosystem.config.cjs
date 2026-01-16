module.exports = {
  apps: [
    {
      name: "sentinel-backend",
      cwd: "./backend",
      script: "bun",
      args: "run dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 8080
      }
    }
  ]
};
