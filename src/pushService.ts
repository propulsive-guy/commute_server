import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import User from './models/User';

const expo = new Expo();

export const sendPushNotification = async (userId: string, title: string, body: string, data?: any) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.expoPushToken) {
            console.log(`No push token for user ${userId}`);
            return;
        }

        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.error(`Invalid Expo push token: ${user.expoPushToken}`);
            return;
        }

        const message: ExpoPushMessage = {
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
            } catch (error) {
                console.error('Error sending push chunk:', error);
            }
        }
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
};
