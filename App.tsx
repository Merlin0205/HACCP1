import React, { useState, useCallback, useMemo, useRef } from 'react';
import { AppState, AuditData, AuditStructure, AuditAnswer, AuditHeaderValues, SavedAudit } from './types';
import { DEFAULT_AUDIT_STRUCTURE } from './constants';
import Header from './components/Header';
import AuditChecklist from './components/AuditChecklist';
import SummaryReport from './components/SummaryReport';
import AdminScreen from './components/AdminScreen';
import { usePersistentState } from './hooks/usePersistentState';
import WelcomeScreen from './components/WelcomeScreen';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [lastAppState, setLastAppState] = useState<AppState>(AppState.WELCOME);
  const [auditData, setAuditData] = useState<AuditData>({ headerValues: {}, answers: {} });
  const [auditStructure, setAuditStructure] = usePersistentState<AuditStructure>('auditStructure', DEFAULT_AUDIT_STRUCTURE);

  const activeItems = useMemo(() => {
    return auditStructure.audit_sections
      .filter(section => section.active)
      .flatMap(section => section.items.filter(item => item.active));
  }, [auditStructure]);
    
  const handleWelcomeContinue = () => {
    setAppState(AppState.START);
  };
    
  const startAudit = () => {
      const initialAnswers: { [itemId: string]: AuditAnswer } = {};
      activeItems.forEach(item => {
        initialAnswers[item.id] = { compliant: true, nonComplianceData: [] };
      });

      setAuditData({ headerValues: {}, answers: initialAnswers });
      setAppState(AppState.HEADER_FORM);
  }
  
  const handleLoadAudit = (data: SavedAudit) => {
    if (data.auditData && data.auditStructure) {
        // Migration logic for old audit files with single non-compliance object
        Object.keys(data.auditData.answers).forEach(itemId => {
            const answer = data.auditData.answers[itemId];
            if (answer.nonComplianceData && !Array.isArray(answer.nonComplianceData)) {
                // @ts-ignore - Temporarily bypass strict typing for migration
                answer.nonComplianceData = [answer.nonComplianceData];
            }
             if (!answer.nonComplianceData) {
                answer.nonComplianceData = [];
            }
        });

        setAuditData(data.auditData);
        setAuditStructure(data.auditStructure);
        setAppState(AppState.SUMMARY);
    } else {
        alert("Neplatný formát souboru auditu.");
    }
  };

  const handleHeaderComplete = (headerValues: AuditHeaderValues) => {
    setAuditData(prev => ({ ...prev, headerValues }));
    if (activeItems.length > 0) {
      setAppState(AppState.IN_PROGRESS);
    } else {
      setAppState(AppState.SUMMARY); // No active questions, go straight to summary
    }
  }

  const handleAnswerUpdate = useCallback((itemId: string, answer: AuditAnswer) => {
    setAuditData(prevData => ({
      ...prevData,
      answers: {
        ...prevData.answers,
        [itemId]: answer,
      }
    }));
  }, []);


  const handleFinishAudit = () => {
    setAppState(AppState.SUMMARY);
  };

  const restartAudit = () => {
    setAppState(AppState.WELCOME);
    setAuditData({ headerValues: {}, answers: {} });
  };

  const handleToggleAdmin = () => {
    if (appState === AppState.ADMIN) {
      setAppState(lastAppState);
    } else {
      setLastAppState(appState);
      setAppState(AppState.ADMIN);
    }
  };
  
  const renderContent = () => {
    switch (appState) {
      case AppState.WELCOME:
        return <WelcomeScreen onContinue={handleWelcomeContinue} />;
      case AppState.START:
        return <StartScreen onStart={startAudit} onFileLoad={handleLoadAudit} />;
      case AppState.HEADER_FORM:
        return <HeaderForm headerData={auditStructure.header_data} onComplete={handleHeaderComplete} />;
      case AppState.IN_PROGRESS:
        if (activeItems.length === 0) {
            return (
                <div className="text-center bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4">Nejsou aktivní žádné otázky</h2>
                    <p className="text-gray-600 mb-6">Přejděte prosím do správy a aktivujte alespoň jednu položku auditu.</p>
                    <button onClick={() => setAppState(AppState.SUMMARY)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">
                        Dokončit prázdný audit
                    </button>
                </div>
            );
        }
        return (
            <AuditChecklist
              auditStructure={auditStructure}
              auditData={auditData}
              onAnswerUpdate={handleAnswerUpdate}
              onComplete={handleFinishAudit}
            />
        );
      case AppState.SUMMARY:
        return <SummaryReport auditData={auditData} auditStructure={auditStructure} onRestart={restartAudit} />;
      case AppState.ADMIN:
        return <AdminScreen auditStructure={auditStructure} setAuditStructure={setAuditStructure} />;
      default:
        return <WelcomeScreen onContinue={handleWelcomeContinue} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <Header appState={appState} onToggleAdmin={handleToggleAdmin} />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
};

interface StartScreenProps {
  onStart: () => void;
  onFileLoad: (data: SavedAudit) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onFileLoad }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    const parsedData = JSON.parse(result);
                    onFileLoad(parsedData);
                }
            } catch (error) {
                console.error("Error parsing audit file:", error);
                alert("Soubor s auditem je poškozený nebo v neplatném formátu.");
            }
        };
        reader.readAsText(file);
        
        // Reset file input value to allow loading the same file again
        event.target.value = '';
    };

    return (
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-lg animate-fade-in text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">Asistent pro HACCP Audity</h2>
            <p className="text-gray-500 mb-8">Zahajte nový audit nebo pokračujte v rozpracované práci nahráním souboru.</p>
            <div className="space-y-4">
                 <button
                    onClick={onStart}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
                >
                    Zahájit nový audit
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".json,application/json"
                />
                 <button
                    onClick={handleLoadClick}
                    className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-transform transform hover:scale-105"
                >
                    Nahrát audit ze souboru
                </button>
            </div>
        </div>
    );
};

interface HeaderFormProps {
    headerData: AuditStructure['header_data'];
    onComplete: (headerValues: AuditHeaderValues) => void;
}

const HeaderForm: React.FC<HeaderFormProps> = ({ headerData, onComplete }) => {
    const [values, setValues] = useState<AuditHeaderValues>(() => {
        const initial: AuditHeaderValues = {};
        Object.values(headerData).forEach(section => {
            if (section.fields) {
                section.fields.forEach(field => {
                    initial[field.id] = field.type === 'date' ? new Date().toISOString().split('T')[0] : '';
                });
            }
        });
        return initial;
    });

    const handleChange = (id: string, value: string) => {
        setValues(prev => ({...prev, [id]: value}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onComplete(values);
    }
    
    const handleGenerateRandomData = () => {
        const removeDiacritics = (str: string) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        
        const firstNames = ["Jana", "Eva", "Petra", "Lucie", "Tomáš", "Pavel", "Marek", "Jakub"];
        const lastNames = ["Nováková", "Svobodová", "Černá", "Dvořáková", "Novák", "Svoboda", "Černý", "Dvořák"];
        const cities = [
            { name: "Praha", zip: "110 00" },
            { name: "Brno", zip: "602 00" },
            { name: "Ostrava", zip: "702 00" },
            { name: "Plzeň", zip: "301 00" },
            { name: "Liberec", zip: "460 01" }
        ];
        const streets = ["Hlavní", "Nádražní", "Školní", "Zahradní", "Masarykova"];
        const schoolNames = ["ZŠ Komenského", "ZŠ Mírová", "ZŠ Slunečná", "Gymnázium J. K. Tyla"];

        const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
        const getRandomDigits = (length: number): string => Math.floor(Math.random() * (10 ** length)).toString().padStart(length, '0');

        const responsiblePersonFirstName = getRandomItem(firstNames);
        const responsiblePersonLastName = getRandomItem(lastNames);
        const statutoryFirstName = getRandomItem(firstNames);
        const statutoryLastName = getRandomItem(lastNames);
        const auditorFirstName = getRandomItem(firstNames);
        const auditorLastName = getRandomItem(lastNames);
        const repFirstName = getRandomItem(firstNames);
        const repLastName = getRandomItem(lastNames);
        
        const city = getRandomItem(cities);
        const schoolName = getRandomItem(schoolNames);

        const newValues: AuditHeaderValues = {
            // Audited Premise
            premise_name: `Školní jídelna ${schoolName}`,
            premise_address: `${getRandomItem(streets)} ${Math.floor(Math.random() * 100) + 1}, ${city.zip} ${city.name}`,
            premise_responsible_person: `${responsiblePersonFirstName} ${responsiblePersonLastName}`,
            premise_phone: `+420 777 ${getRandomDigits(3)} ${getRandomDigits(3)}`,
            premise_email: `${removeDiacritics(responsiblePersonFirstName.toLowerCase())}.${removeDiacritics(responsiblePersonLastName.toLowerCase())}@skola.cz`,

            // Operator
            operator_name: `Město ${city.name}, příspěvková organizace`,
            operator_address: `Radniční ${Math.floor(Math.random() * 10) + 1}, ${city.zip} ${city.name}`,
            operator_ico: getRandomDigits(8),
            operator_statutory_body: `ředitel/ka ${statutoryFirstName} ${statutoryLastName}`,
            operator_phone: `+420 603 ${getRandomDigits(3)} ${getRandomDigits(3)}`,
            operator_email: `reditel@${removeDiacritics(city.name.toLowerCase().replace(/\s/g, ''))}.cz`,

            // Auditor
            auditor_name: `${auditorFirstName} ${auditorLastName}`,
            auditor_phone: `+420 724 ${getRandomDigits(3)} ${getRandomDigits(3)}`,
            auditor_email: `audit@${removeDiacritics(auditorLastName.toLowerCase())}.cz`,
            auditor_web: `www.${removeDiacritics(auditorLastName.toLowerCase())}-haccp.cz`,

            // Audit Meta
            audit_date: new Date().toISOString().split('T')[0],
            operator_representative: `${repFirstName} ${repLastName} (vedoucí školní jídelny)`,
        };
        setValues(newValues);
    };

    const renderSection = (section: any) => (
        <div key={section.title} className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-xl font-bold text-gray-700 mb-4">{section.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field : any) => (
                    <div key={field.id}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                        <input
                            type={field.type}
                            id={field.id}
                            value={values[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                            required={field.id !== 'auditor_web'} // Make web optional
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-4xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Základní údaje auditu</h2>
                <button
                    type="button"
                    onClick={handleGenerateRandomData}
                    className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                    Vygenerovat náhodná data
                </button>
            </div>
            {renderSection(headerData.audited_premise)}
            {renderSection(headerData.operator)}
            {renderSection(headerData.auditor)}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {headerData.audit_meta.fields.map(field => (
                    <div key={field.id}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                        <input
                            type={field.type}
                            id={field.id}
                            value={values[field.id] || ''}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-shadow"
                            required
                        />
                    </div>
                ))}
              </div>
            </div>
            <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
            >
                Zahájit kontrolu
            </button>
        </form>
    );
};


export default App;