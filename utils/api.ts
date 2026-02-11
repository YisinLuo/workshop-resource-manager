
const API_URL = import.meta.env.VITE_GAS_API_URL;

if (!API_URL) {
  console.error("VITE_GAS_API_URL is not defined in environment variables!");
}

export const fetchData = async (action: string, payload: any = {}) => {
  try {
    const options: RequestInit = {
      method: "POST", // GAS Web App mainly uses POST for data interaction
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // GAS requires text/plain to avoid preflight issues sometimes
      },
      body: JSON.stringify({ action, ...payload }),
    };

    // If it's a simple GET request for initial state, we might treat it differently,
    // but our GAS `doGet` handles simple fetches. 
    // However, to keep it unified, we can use POST for everything if our GAS doPost handles it.
    // Our GAS `doPost` handles 'bookVenue', 'cancelVenue', etc.
    // Our GAS `doGet` returns all data.
    
    // If action is 'getAll', we use GET method
    if (action === 'getAll') {
        const response = await fetch(API_URL);
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Error parsing JSON response:", text);
            throw e;
        }
    }

    const response = await fetch(API_URL, options);
    const json = await response.json();
    return json;

  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
