import axios from 'axios';

export const webService = {

    async fetchEntries(server, projectSlug) {
        let currentPage = 1;
        let totalPages = 1;
        const filePattern = /([^/]+)_(\d+)\.(mp4|jpg)$/; // Regex pattern

        // Clear existing extracted entries before fetching
        const extractedEntries = [];

        do {
            try {
                const response = await axios.get(`${server}/api/export/entries/${projectSlug}`, {
                    params: {page: currentPage}
                });
                // Check if the response contains data
                if (response.data && response.data.data) {
                    // Loop through each entry
                    response.data.data.entries.forEach((entry) => {
                        // Loop through each property of the entry object
                        Object.entries(entry).forEach(([key, value]) => {
                            console.log(key, value);
                            // Check if the value is a string and matches the desired pattern
                            if (typeof value === 'string') {
                                const match = value.match(filePattern); // Using regex pattern
                                if (match) {
                                    extractedEntries.push(value); // Store matching filenames
                                }
                            }
                        });
                    });
                    // Update total pages from the response
                    totalPages = response.data.meta.last_page;
                }
                currentPage++;

            } catch (error) {
                console.error('Error fetching entries:', error);
                break; // Exit on error
            }
        } while (currentPage <= totalPages);
        
        return extractedEntries;
    }
};