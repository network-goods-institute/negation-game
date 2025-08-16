"use client";

import React, { useMemo } from "react";
import DOMPurify from "dompurify";

interface Props {
    html: string;
}

export function SanitizedHtml({ html }: Props) {
    const safe = useMemo(() => {
        try {
            return DOMPurify.sanitize(html, {
                USE_PROFILES: { html: true },
                ALLOW_DATA_ATTR: false,
            });
        } catch {
            return "";
        }
    }, [html]);

    return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}

export default SanitizedHtml;


