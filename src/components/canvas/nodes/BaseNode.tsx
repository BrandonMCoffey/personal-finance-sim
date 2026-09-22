import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';

interface BaseNodeProps {
    title: string;
    subtitle?: string;
    bgColor: string;
    borderColor: string;
    titleColor: string;
    isSnapped?: boolean;
    sourceHandle?: { color: string; position?: Position };
    targetHandle?: { color: string; position?: Position };
    children: React.ReactNode;
    onRename?: (newName: string) => void;
    headerElement?: React.ReactNode;
    className?: string;
}

export function BaseNode({ title, subtitle, bgColor, borderColor, titleColor, isSnapped, sourceHandle, targetHandle, children, onRename, headerElement, className }: BaseNodeProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(title);

    const handleBlur = () => {
        setIsEditing(false);
        if (onRename && editName.trim()) {
            onRename(editName.trim());
        } else {
            setEditName(title);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(title);
        }
    };

    const snappedStyle = isSnapped ? 'rounded-t-none shadow-none z-0 border-t-0' : 'rounded-md shadow-md z-10';
    const containerClass = className || 'w-[160px] flex-col';

    return (
        <div className={`relative px-3 py-2 border-2 flex min-h-[50px] ${containerClass} ${bgColor} ${borderColor} ${snappedStyle}`}>
            {targetHandle && !isSnapped && <Handle type="target" position={targetHandle.position || Position.Left} className={`w-3 h-3 ${targetHandle.color}`} />}

            <div className={`flex justify-between items-start ${className?.includes('flex-row') ? 'w-1/2 pr-2' : 'mb-1 w-full'}`}>
                {isEditing && onRename ? (
                    <input
                        autoFocus
                        className="w-full text-sm font-bold text-gray-900 bg-white/80 border border-gray-300 rounded px-1 outline-none"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <span
                        className={`text-sm font-bold truncate leading-tight ${titleColor} ${onRename ? 'cursor-text hover:opacity-80' : ''}`}
                        onDoubleClick={() => onRename && setIsEditing(true)}
                        title={onRename ? "Double click to rename" : ""}
                    >
                        {title}
                    </span>
                )}
                <div className="flex flex-col items-end shrink-0 ml-1">
                    {subtitle && <span className="text-[9px] uppercase font-black opacity-50 leading-none mb-0.5">{subtitle}</span>}
                    {headerElement}
                </div>
            </div>

            <div className={`flex-1 flex w-full ${className?.includes('flex-row') ? 'flex-row items-center' : 'flex-col justify-end'}`}>
                {children}
            </div>

            {sourceHandle && <Handle type="source" position={sourceHandle.position || Position.Right} className={`w-3 h-3 ${sourceHandle.color}`} />}
        </div>
    );
}