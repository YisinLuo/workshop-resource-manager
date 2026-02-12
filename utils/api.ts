/**
 * API Service for connecting to Google Apps Script Backend
 */

// Config
const API_URL = import.meta.env.VITE_GAS_API_URL;

type PostAction = 'GET_ALL_DATA' | 'BOOK_VENUE' | 'CANCEL_BOOKING' | 'BORROW_ITEMS' | 'TRANSFER_ITEMS' | 'RETURN_ITEMS' | 'UPLOAD_IMAGE';

async function post(action: PostAction, data: any = {}) {
    if (!API_URL) {
        console.warn('API URL not set. Check .env file.');
        throw new Error('API URL not set');
    }

    // DEBUG: Verify which URL is being used
    console.log('Using API URL:', API_URL.substring(0, 30) + '...');

    // Use fetch with 'no-cors' mode is NOT what we want for reading response.
    // We use standard CORS request.
    // GAS Web App must be deployed to "Anyone" execution "Me".
    // We send data as URL encoded parameters or stringified body.
    // Using text/plain content type prevents preflight OPTIONS request which GAS sometimes dislikes.

    const payload = JSON.stringify({ action, ...data });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: payload
        });

        const result = await response.json();
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        return result;
    } catch (error) {
        console.error(`API Error (${action}):`, error);
        throw error;
    }
}

export const api = {
    post,
    isValid: () => !!API_URL,

    getAllData: () => post('GET_ALL_DATA'),

    bookVenue: (payload: any) => post('BOOK_VENUE', payload),

    cancelBooking: (id: string, password: string, datesToRemove: string[]) =>
        post('CANCEL_BOOKING', { id, password, datesToRemove }),

    borrowItems: (payload: any) => post('BORROW_ITEMS', payload),

    transferItems: (sessionId: string, from: string, to: string, time: string) =>
        post('TRANSFER_ITEMS', { sessionId, from, to, time }),

    returnItems: (payload: any) => post('RETURN_ITEMS', payload),

    uploadImage: (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const result = await post('UPLOAD_IMAGE', {
                        fileName: file.name,
                        mimeType: file.type,
                        base64: base64
                    });
                    resolve(result.url);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = error => reject(error);
        });
    }
};
