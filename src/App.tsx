/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FolderOpen, Download, FileText, TreePine, Loader2, CheckCircle2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileInfo {
  path: string;
  content: string;
  name: string;
}

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [treeString, setTreeString] = useState<string>('');
  const [combinedContent, setCombinedContent] = useState<string>('');
  const [fileCount, setFileCount] = useState(0);
  const [folderName, setFolderName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setTreeString('');
    setCombinedContent('');
    
    // Get the root folder name
    const firstFile = files[0];
    const rootFolder = (firstFile as any).webkitRelativePath?.split('/')[0] || 'project';
    setFolderName(rootFolder);

    try {
      const fileList = Array.from(files) as File[];
      
      // 1. Generate Tree
      const tree = generateTree(fileList);
      setTreeString(tree);

      // 2. Extract Content
      const allowedExtensions = ['.css', '.php', '.js', '.htaccess', '.html', '.ts', '.tsx', '.json', '.txt', '.py', '.sql'];
      const extractedFiles: FileInfo[] = [];

      for (const file of fileList) {
        const fileName = file.name;
        const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext)) || fileName === '.htaccess';
        
        if (isAllowed) {
          const content = await readFileContent(file);
          extractedFiles.push({
            path: (file as any).webkitRelativePath || file.name,
            content,
            name: fileName
          });
        }
      }

      // 3. Combine Content
      let finalDoc = `DIRECTORY TREE:\n${tree}\n\n${'='.repeat(50)}\n\n`;
      
      extractedFiles.forEach((file, index) => {
        finalDoc += `FILE PATH: ${file.path}\n`;
        finalDoc += `${'-'.repeat(file.path.length + 11)}\n`;
        finalDoc += file.content;
        
        if (index < extractedFiles.length - 1) {
          finalDoc += '\n'.repeat(11);
        }
      });

      setCombinedContent(finalDoc);
      setFileCount(extractedFiles.length);
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Er is een fout opgetreden bij het verwerken van de bestanden.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTree = (files: File[]): string => {
    const root: any = {};
    
    files.forEach(file => {
      const path = (file as any).webkitRelativePath || file.name;
      const parts = path.split('/');
      let current = root;
      parts.forEach((part: string, index: number) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {};
        }
        current = current[part];
      });
    });

    const buildTreeString = (obj: any, prefix = ''): string => {
      let result = '';
      const keys = Object.keys(obj).sort();
      
      keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        result += `${prefix}${connector}${key}\n`;
        
        if (obj[key] !== null) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          result += buildTreeString(obj[key], newPrefix);
        }
      });
      
      return result;
    };

    const rootKey = Object.keys(root)[0];
    if (!rootKey) return '';
    
    return `${rootKey}\n${buildTreeString(root[rootKey])}`;
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const downloadFile = () => {
    if (!combinedContent) return;
    const blob = new Blob([combinedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFolderName = folderName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `project_export_${safeFolderName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!combinedContent) return;
    navigator.clipboard.writeText(combinedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-white font-body selection:bg-accent selection:text-white">
      {/* Header Section */}
      <section className="relative py-20 px-6 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://red-g.pro/assets/img/BG-rGpv2.png')] bg-center bg-cover opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <span className="font-sub text-accent text-xs tracking-[3px] uppercase block">Productie Tool</span>
            <h1 className="text-4xl md:text-6xl font-h leading-tight">
              CodeTree Extractor<br />
              <span className="text-text-muted font-light">voor AI Context</span>
            </h1>
            <p className="text-text-muted max-w-2xl text-lg leading-relaxed">
              Genereer een visuele directory tree en extraheer alle broncode uit een map naar één enkel document. Ideaal om je volledige projectstructuur en code mee te geven aan AI assistenten.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto py-16 px-6 space-y-12">
        {/* Selection Card */}
        <section className="bg-bg-panel border-l-4 border-accent p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl font-h">Selecteer je projectmap</h2>
              <p className="text-text-muted">
                Kies de hoofdmap van je project. De tool zal automatisch alle submappen scannen en relevante bestanden (.php, .js, .css, .htaccess, etc.) extraheren.
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFolderSelect}
                className="hidden"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
              />
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-accent hover:bg-accent-dark text-white px-8 py-4 font-sub text-sm uppercase tracking-[1.5px] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verwerken...
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-5 h-5" />
                      Kies Map
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="hidden md:block">
              <div className="border border-white/10 p-6 bg-black/20 font-mono text-[10px] text-text-muted/50 overflow-hidden select-none">
                <div className="opacity-40">
                  red-G-pro/<br />
                  ├── .htaccess<br />
                  ├── index.php<br />
                  ├── assets/<br />
                  │   ├── css/<br />
                  │   │   └── style.css<br />
                  │   └── img/<br />
                  └── includes/<br />
                      ├── header.php<br />
                      └── footer.php
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {treeString && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="grid md:grid-cols-3 gap-8">
                {/* Tree View */}
                <div className="md:col-span-2 bg-bg-panel border-l-4 border-accent p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-accent font-sub text-xs uppercase tracking-[2px]">
                      <TreePine className="w-4 h-4" />
                      Directory Tree
                    </div>
                  </div>
                  <pre className="bg-black/40 p-6 font-mono text-xs text-text-white overflow-auto max-h-[500px] border border-white/5">
                    {treeString}
                  </pre>
                </div>

                {/* Status & Actions */}
                <div className="bg-bg-panel border-l-4 border-accent p-8 flex flex-col">
                  <div className="flex items-center gap-3 text-accent font-sub text-xs uppercase tracking-[2px] mb-8">
                    <FileText className="w-4 h-4" />
                    Status
                  </div>
                  
                  <div className="flex-grow flex flex-col justify-center">
                    <div className="text-accent mb-4">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-3xl font-h mb-2">{fileCount} Bestanden</h3>
                    <p className="text-text-muted text-sm mb-8">
                      Alle code is succesvol samengevoegd met pad-vermeldingen en scheidingslijnen.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={copyToClipboard}
                      className="w-full border border-white/20 hover:bg-white hover:text-bg-dark text-white px-6 py-4 font-sub text-xs uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Gekopieerd!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Kopieer Code
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadFile}
                      className="w-full bg-accent hover:bg-accent-dark text-white px-6 py-4 font-sub text-xs uppercase tracking-[1.5px] transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download .txt
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-white/5 text-center">
        <div className="container opacity-40">
          <img src="https://red-g.pro/assets/img/logo_naam_rGp.png" alt="red-G Productie" className="h-8 mx-auto mb-4 grayscale" />
          <p className="text-xs font-sub uppercase tracking-[2px]">&copy; {new Date().getFullYear()} red-G Productie &mdash; David Auwerx</p>
        </div>
      </footer>
    </div>
  );
}
