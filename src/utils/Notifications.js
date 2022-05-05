const { Expo } = require("expo-server-sdk");

module.exports = class Notifications {
  static async sendNotification(title = "Selyt", body, token, data = {}) {
    const expo = new Expo();

    const message = {
      to: token,
      sound: "default",
      title,
      body,
      data,
    };

    try {
      await expo.sendPushNotificationsAsync([message]);
    } catch (error) {
      console.error(error);
    }
  }
};
