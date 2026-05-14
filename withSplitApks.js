const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withSplitApks(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Look for enableSeparateBuildPerCPUArchitecture and set it to true
      config.modResults.contents = config.modResults.contents.replace(
        /def enableSeparateBuildPerCPUArchitecture = false/,
        'def enableSeparateBuildPerCPUArchitecture = true'
      );
    }
    return config;
  });
};
