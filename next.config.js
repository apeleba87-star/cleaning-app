/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Capacitor 개발 환경을 위한 CORS 설정
  allowedDevOrigins: ['192.168.219.41', '10.0.2.2', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'postfiles.pstatic.net',
      },
      {
        protocol: 'https',
        hostname: '*.naver.com',
      },
    ],
  },
  // 프로덕션 빌드 최적화: console.log 제거
  webpack: (config, { dev, isServer }) => {
    // 프로덕션 빌드일 때만 console 제거 (클라이언트 사이드만)
    if (!dev && !isServer) {
      const minimizer = config.optimization.minimizer || []
      const TerserPlugin = require('terser-webpack-plugin')
      
      // 기존 TerserPlugin 찾기
      const terserPluginIndex = minimizer.findIndex(
        (plugin) => plugin.constructor.name === 'TerserPlugin'
      )
      
      if (terserPluginIndex > -1) {
        // 기존 TerserPlugin 수정
        const existingPlugin = minimizer[terserPluginIndex]
        const existingOptions = existingPlugin.options || {}
        const existingTerserOptions = existingOptions.terserOptions || {}
        const existingCompress = existingTerserOptions.compress || {}
        
        minimizer[terserPluginIndex] = new TerserPlugin({
          ...existingOptions,
          terserOptions: {
            ...existingTerserOptions,
            compress: {
              ...existingCompress,
              drop_console: true, // console.* 제거
            },
          },
        })
      } else {
        // TerserPlugin이 없으면 추가
        minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true, // console.* 제거
              },
            },
          })
        )
      }
      
      config.optimization.minimizer = minimizer
    }
    
    return config
  },
}

module.exports = nextConfig
