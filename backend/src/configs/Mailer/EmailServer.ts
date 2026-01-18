import { MailtrapClient } from "mailtrap";

const TOKEN = process.env.MAILTRAP_API_TOKEN!;

if (!TOKEN) {
    throw new Error("MAILTRAP_API_TOKEN is missing in env");
}

const client = new MailtrapClient({
    token: TOKEN,
});

const sender = {
    email: "authhub@emails.shivankpandey.xyz",
    name: "Authentication",
};

export { client, sender };
