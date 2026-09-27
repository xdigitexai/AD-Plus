module.exports = {
  apps: [
    {
      name: "ad-plus",
      cwd: "/var/www/ad-plus.novaspack.com",
      script: "npm",
      args: "run start -- -H 127.0.0.1 -p 3011",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3011",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
