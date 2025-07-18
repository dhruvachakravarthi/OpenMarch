import { Badge } from "@/components/index";

export const PreviewProps = {
    title: "Badge",
    variants: [
        {
            title: "variant",
            options: ["primary", "secondary", "red"],
            default: "primary",
        },
    ],
};

export default function Preview({ ...props }) {
    return <Badge {...props}>Badge</Badge>;
}
