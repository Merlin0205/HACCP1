import { generateId, YooptaPlugin } from '@yoopta/editor';

const AuditItemRender = ({ attributes, children, element }: any) => {
    const { title, status, description } = element.data || {};
    const isCompliant = status === 'VYHOVUJE';

    return (
        <div
            {...attributes}
            className="my-2 p-4 border rounded-lg shadow-sm bg-white"
            style={{ borderLeft: `4px solid ${isCompliant ? '#22c55e' : '#ef4444'}` }}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-800">{title}</span>
                <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${isCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                >
                    {status}
                </span>
            </div>
            {description && (
                <div className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Poznámka:</span> {description}
                </div>
            )}
            {/* Required by Slate/Yoopta to render children (even if empty) */}
            <div className="hidden">{children}</div>
        </div>
    );
};

const AuditItemPlugin: any = {
    type: 'AuditItem',
    render: AuditItemRender,
    events: {},
    options: {
        display: {
            title: 'Audit Item',
            description: 'Custom block for audit items',
        },
    },
    createElement: (editor, type, data) => {
        return {
            id: generateId(),
            type,
            children: [{ text: '' }],
            data: data || { title: 'New Item', status: 'VYHOVUJE', description: '' },
        };
    },
};

export default AuditItemPlugin;
