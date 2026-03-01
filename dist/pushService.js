"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = void 0;
const expo_server_sdk_1 = require("expo-server-sdk");
const User_1 = __importDefault(require("./models/User"));
const expo = new expo_server_sdk_1.Expo();
const sendPushNotification = async (userId, title, body, data) => {
    try {
        const user = await User_1.default.findById(userId);
        if (!user || !user.expoPushToken) {
            console.log(`No push token for user ${userId}`);
            return;
        }
        if (!expo_server_sdk_1.Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`Invalid Expo push token: ${user.expoPushToken}`);
            return;
        }
        const message = {
            to: user.expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        };
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Push sent:', ticketChunk);
            }
            catch (error) {
                console.error('Error sending push chunk:', error);
            }
        }
    }
    catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};
exports.sendPushNotification = sendPushNotification;
