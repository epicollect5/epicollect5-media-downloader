export const utilsService = {
    // Function to extract server URL and project slug from the project URL
    extractServerAndSlug(url) {
        try {
            const urlObj = new URL(url);
            const server = `${urlObj.protocol}//${urlObj.host}`;
            const projectSlug = urlObj.pathname.split('/').filter(Boolean).pop();
            return {server, projectSlug};
        } catch (error) {
            console.error('Invalid URL:', error);
            return null;
        }
    }
};
