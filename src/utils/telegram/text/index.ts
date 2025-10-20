export const formatText = async (text: string, callbacks: ((args?: any) => any)[]) => {

    const results = await Promise.all(callbacks.map(cb => cb()));

    const formattedText = text.replace(/{(\d+)}/g, (match, number) => {
        return typeof results[number] !== 'undefined' ? results[number] : match;
    });

    return formattedText;
}