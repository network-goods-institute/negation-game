import React from 'react';
import { RationaleCreator, RationaleCreatorProps } from '../forms/RationaleCreator';

export type AIAssistantRationaleProps = RationaleCreatorProps;

export function AIAssistantRationale(props: AIAssistantRationaleProps) {
    return <RationaleCreator {...props} />;
} 