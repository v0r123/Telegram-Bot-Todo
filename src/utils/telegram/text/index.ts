type FormatCallback = () => Promise<string>;

export const formatText = async (text: string, callbacks: FormatCallback[]) => {

    if (typeof text !== 'string') {
        throw new TypeError('The "text" parameter must be a string');
    }

    if (!Array.isArray(callbacks)) {
        throw new TypeError('The "callbacks" parameter must be an array');
    }

    if (!/{(\d+)}/.test(text)) {
        return text;
    }

    const results = await Promise.all(callbacks.map(cb => cb()));
    const maxIndex = results.length - 1;

    return text.replace(/{(\d+)}/g, (match, number) => {
        const index = Number(number);
        if (index > maxIndex) {
            throw new Error(`Placeholder index ${index} exceeds available results`);
        }

        return typeof results[number] !== 'undefined' ? results[number] : match;
    });

}