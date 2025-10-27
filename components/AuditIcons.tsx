import React from 'react';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-8 w-8"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {children}
    </svg>
);

const LayoutIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></IconWrapper>;
const EquipmentIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.472-2.472a3.375 3.375 0 00-4.773-4.773L6.75 10.5M11.42 15.17L6.75 10.5m4.67 4.67l-2.472-2.472a3.375 3.375 0 00-4.773-4.773L6.75 10.5" /></IconWrapper>;
const WaterIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" transform="rotate(90 12 12)" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6c0-4-6-10.5-6-10.5s-6 6.5-6 10.5a6 6 0 006 6z" /></IconWrapper>;
const FloorIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M2.25 12l8.954 8.955c.44.439 1.152.439 1.591 0L21.75 12M2.25 12h19.5" /></IconWrapper>;
const WallIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path d="M5 21h14" /><path d="M5 20v-4h14v4" /><path d="M5 15h14" /><path d="M5 14v-4h14v4" /><path d="M5 9h14" /><path d="M5 8V4h14v4" /><path d="M5 3h14" /></IconWrapper>;
const CeilingIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18" /></IconWrapper>;
const WindowIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5h16.5V3.75H3.75zM3.75 12h16.5m-8.25-8.25v16.5" /></IconWrapper>;
const DoorIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 1.5v21h15V1.5h-15z" /><path d="M15 12a.5.5 0 100-1 .5.5 0 000 1z" /></IconWrapper>;
const SurfaceIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75l4.5-4.5 4.5 4.5 4.5-4.5 4.5 4.5M6 21v-3m4 3v-3m4 3v-3m4 3v-3" /></IconWrapper>;
const SinkIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></IconWrapper>;
const VentilationIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a5.25 5.25 0 110 10.5 5.25 5.25 0 010-10.5zM12 6.75L15.75 3 12 6.75zm0 0L8.25 3 12 6.75zm0 10.5l3.75 3.75L12 17.25zm0 0L8.25 21 12 17.25zM6.75 12l-3.75-3.75L6.75 12zm0 0l-3.75 3.75L6.75 12zm10.5 0l3.75-3.75-3.75 3.75zm0 0l3.75 3.75-3.75-3.75z" /></IconWrapper>;
const LightingIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17.25h4.5M9 14.25h6M9 11.25h6M12 21a9 9 0 006.364-2.636A9 9 0 0012 3a9 9 0 00-6.364 15.364A9 9 0 0012 21z" /></IconWrapper>;
const SewerageIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5v15M19.5 4.5v15M4.5 12h15" /></IconWrapper>;
const ChangingRoomIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75l-3.75 3.75-3.75-3.75M15.75 6.75h3.75l-3.75-3.75h-3.75l-3.75 3.75h3.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v10.5m0 0l-3.75-3.75m3.75 3.75l3.75-3.75" /></IconWrapper>;
const ToiletIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l-2.25 2.25-1.5-1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 18.75h12V21H6v-2.25z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 18.75C6 14.08 8.686 12 12 12s6 2.08 6 6.75" /></IconWrapper>;
const CleaningRoomIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12V3" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12H9" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12h-1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v9" /></IconWrapper>;
const EntryControlIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></IconWrapper>;
const IdentifiabilityIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></IconWrapper>;
const StorageIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></IconWrapper>;
const CoolingIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m-4.879-8.379l9.758 9.758m-9.758 0l9.758-9.758m-4.879 8.379V4.5m4.879 8.379h-9.758" /></IconWrapper>;
const FreezingIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m-4.879-8.379l9.758 9.758m-9.758 0l9.758-9.758m-4.879 8.379V4.5m4.879 8.379h-9.758M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></IconWrapper>;
const DryStorageIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></IconWrapper>;
const DefrostingIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v3.75m0 0v3.75m0-3.75h3.75m-3.75 0H8.25m0 0L5.625 5.625m2.625 2.625L5.625 10.5m10.125-2.625L18.375 5.625m-2.625 2.625L18.375 10.5M12 12.75v3.75m0 0v3.75m0-3.75h3.75m-3.75 0H8.25" /></IconWrapper>;
const GmpIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28a11.95 11.95 0 00-5.814 5.519L9 11.25" /></IconWrapper>;
const CleanlinessIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.567L16.5 21.75l-.398-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.183a2.25 2.25 0 001.423 1.423l1.183.398-1.183.398a2.25 2.25 0 00-1.423 1.423z" /></IconWrapper>;
const TechnicalEquipmentIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 4.907A7.502 7.502 0 0112 4.5v.75m-8.457 4.907a7.5 7.5 0 0012.729 4.907" /></IconWrapper>;
const CrossContaminationIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 010-11.667l-3.181 3.182m0 0l-3.181-3.182m0 0h4.992m-4.993 0v4.992" /></IconWrapper>;
const DistributionIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path d="M9 6h10.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H15M9 6V4.5a1.5 1.5 0 00-1.5-1.5H3a1.5 1.5 0 00-1.5 1.5v10.5A1.5 1.5 0 003 16.5h3" /><path d="M15 16.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6 16.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></IconWrapper>;
const FoodExportIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L6 12z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></IconWrapper>;
const AllergensIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 009-9h-9v9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 019 9h-9V3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 009 9V12H3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 019-9v9H3z" /></IconWrapper>;
const HealthStatusIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></IconWrapper>;
const PersonalCleanlinessIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.25 10.5a2.25 2.25 0 00-2.25 2.25v.75a2.25 2.25 0 004.5 0v-.75a2.25 2.25 0 00-2.25-2.25z" /></IconWrapper>;
const TrainingIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /><path d="M19.5 21v-2.25a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 18.75V21" /></IconWrapper>;
const BehaviorIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15" /></IconWrapper>;
const SanitationPlanIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></IconWrapper>;
const CleaningProductsIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.25 2.25a2.25 2.25 0 010 3.182l-8.414 8.414a2.25 2.25 0 01-3.182 0l-8.414-8.414a2.25 2.25 0 010-3.182l2.25-2.25a2.25 2.25 0 013.182 0l1.409 1.409z" /></IconWrapper>;
const SanitationConditionsIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12" /></IconWrapper>;
const MaintenanceIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.472-2.472a3.375 3.375 0 00-4.773-4.773L6.75 10.5M11.42 15.17L6.75 10.5m4.67 4.67l-2.472-2.472a3.375 3.375 0 00-4.773-4.773L6.75 10.5" /></IconWrapper>;
const DiscardedItemsIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></IconWrapper>;
const LaundryIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v1.5m6-1.5v1.5m-6-1.5v-1.5m0 3v4.5m0-4.5h-1.5m1.5 0h1.5M12 9.75V6.75m0 0H9.75m2.25 0h2.25m-2.25 0V3.75m0 3h-1.5m1.5 0h1.5M12 15.75v3" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></IconWrapper>;
const WasteIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></IconWrapper>;
const HaccpIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.101L12 14.5l3-2.399M9 12.101L4.5 9.5l7.5-3 7.5 3L15 12.101M9 12.101V14.5m6-2.399V14.5m0-4.899l-3 2.399-3-2.399m12-3l-7.5 3-7.5-3L12 3l7.5 3.5z" /></IconWrapper>;
const DocumentationIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></IconWrapper>;
export const QuestionMarkIcon: React.FC<{className?: string}> = ({className}) => <IconWrapper className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></IconWrapper>;


export const iconMap: { [key: string]: React.FC<{className?: string}> } = {
  // INFRASTRUKTURA
  infra_layout: LayoutIcon,
  infra_equipment: EquipmentIcon,
  infra_water: WaterIcon,
  infra_floors: FloorIcon,
  infra_walls: WallIcon,
  infra_ceilings: CeilingIcon,
  infra_windows: WindowIcon,
  infra_doors: DoorIcon,
  infra_surfaces: SurfaceIcon,
  infra_sinks: SinkIcon,
  infra_ventilation: VentilationIcon,
  infra_lighting: LightingIcon,
  infra_sewerage: SewerageIcon,
  infra_changing_room: ChangingRoomIcon,
  infra_staff_wc: ToiletIcon,
  infra_cleaning_room: CleaningRoomIcon,
  // SKLADOVÁNÍ
  storage_entry_control: EntryControlIcon,
  storage_identifiability: IdentifiabilityIcon,
  storage_storing: StorageIcon,
  storage_cooling_eq: CoolingIcon,
  storage_freezing_eq: FreezingIcon,
  storage_dry_storage: DryStorageIcon,
  storage_defrosting: DefrostingIcon,
  // SPRÁVNÁ VÝROBNÍ PRAXE
  gmp_process_monitoring: GmpIcon,
  gmp_cleanliness: CleanlinessIcon,
  gmp_technical_equipment: TechnicalEquipmentIcon,
  gmp_cross_contamination: CrossContaminationIcon,
  gmp_distribution: DistributionIcon,
  gmp_food_export: FoodExportIcon,
  gmp_allergens: AllergensIcon,
  // OSOBNÍ HYGIENA
  hygiene_health_status: HealthStatusIcon,
  hygiene_personal_cleanliness: PersonalCleanlinessIcon,
  hygiene_training: TrainingIcon,
  hygiene_behavior: BehaviorIcon,
  // ČIŠTĚNÍ A DEZINFEKCE
  cleaning_sanitation_plan: SanitationPlanIcon,
  cleaning_products: CleaningProductsIcon,
  cleaning_conditions: SanitationConditionsIcon,
  cleaning_maintenance: MaintenanceIcon,
  cleaning_discarded_items: DiscardedItemsIcon,
  cleaning_laundry: LaundryIcon,
  cleaning_waste: WasteIcon,
  // HACCP
  haccp_system: HaccpIcon,
  haccp_documentation: DocumentationIcon,
};
