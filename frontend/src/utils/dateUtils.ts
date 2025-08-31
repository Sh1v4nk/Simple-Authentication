export const formatDate = (
    date: Date = new Date(),
    locale: string = "en-US",
    options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
    },
) => {
    return date.toLocaleString(locale, options);
};
