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
                console.log(`Push sent to user ${userId}:`, JSON.stringify(ticketChunk));

                // NOTE: In production, you would want to save these tickets and 
                // check for "DeviceNotRegistered" errors later to remove stale tokens.
                for (const ticket of ticketChunk) {
                    if (ticket.status === 'error') {
                        console.error(`Error sending push to user ${userId}:`, ticket.message);
                        if (ticket.details && (ticket.details as any).error === 'DeviceNotRegistered') {
                            console.warn(`Token for user ${userId} is no longer valid. Marking for removal.`);
                            // Optional: await User.findByIdAndUpdate(userId, { expoPushToken: null });
                        }
                    }
                }
            } catch (error) {
                console.error(`Fatal error sending push chunk for user ${userId}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in sendPushNotification wrapper:', error);
    }
};
