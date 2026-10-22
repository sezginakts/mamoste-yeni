// Expo'nun varsayılan Metro yapılandırmasını genişletir.
// mp3 (ses) ve diğer asset'lerin production build'de doğru paketlenmesini sağlar.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ses dosyalarının asset olarak tanındığından emin ol (gömülü neural sesler).
if (!config.resolver.assetExts.includes('mp3')) {
  config.resolver.assetExts.push('mp3');
}

module.exports = config;
