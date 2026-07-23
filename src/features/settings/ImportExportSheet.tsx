import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AlertCircle, CheckCircle2, Download, FileUp, Upload } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { Sheet, type BottomSheetModal } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useMovies } from '@/hooks/useMovies';

import { isDuplicate, parseImport, serializeExport } from './dataTransfer';

const MUTED = 'hsl(0 0% 63.9%)';

type Tab = 'export' | 'import';
type LogEntry = { ok: boolean; message: string };

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

// Writes the JSON somewhere the user can keep it. On web that's a download; on
// native we stage the file in the cache dir and hand it to the share sheet.
async function saveExport(json: string) {
  const filename = `radar_backup_${todayStamp()}.json`;
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
}

async function readPickedFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  // Web hands back a blob: URL (fetchable); native gives a file:// uri readable
  // through the file-system File API.
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return res.text();
  }
  return new File(uri).text();
}

export const ImportExportSheet = forwardRef<BottomSheetModal>(function ImportExportSheet(_props, ref) {
  const { movies, addMovie } = useMovies();
  const { show } = useToast();

  const [tab, setTab] = useState<Tab>('export');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const doExport = async () => {
    try {
      await saveExport(serializeExport(movies, new Date().toISOString()));
      if (Platform.OS !== 'web') show('Backup ready to share');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const runImport = async (text: string) => {
    const { movies: parsed, errors } = parseImport(text);
    const collected: LogEntry[] = errors.map((message) => ({ ok: false, message }));
    setLogs([...collected]);
    if (parsed.length === 0) {
      setLogs([...collected, { ok: false, message: 'No importable titles found.' }]);
      return;
    }

    setImporting(true);
    let added = 0;
    let skipped = 0;
    try {
      for (const item of parsed) {
        if (isDuplicate(item, movies)) {
          skipped++;
          collected.push({ ok: false, message: `Skipped duplicate: ${item.title}` });
        } else {
          try {
            await addMovie(item);
            added++;
            collected.push({ ok: true, message: `Imported: ${item.title}` });
          } catch (e) {
            collected.push({ ok: false, message: `Failed: ${item.title} — ${e instanceof Error ? e.message : 'error'}` });
          }
        }
        setLogs([...collected]);
      }
      show(`Imported ${added} · skipped ${skipped}`);
    } finally {
      setImporting(false);
    }
  };

  const pickFile = async () => {
    try {
      const text = await readPickedFile();
      if (text) {
        setImportText(text);
        await runImport(text);
      }
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not read the file');
    }
  };

  return (
    <Sheet ref={ref} snapPoints={['70%', '92%']}>
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <Text className="text-lg font-bold text-foreground">Import / Export</Text>

        <View className="flex-row gap-2 rounded-lg border border-border bg-secondary p-1">
          {(['export', 'import'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-md py-2"
              style={{ backgroundColor: tab === t ? 'hsl(0 0% 20%)' : 'transparent' }}
            >
              {t === 'export' ? <Download size={16} color="hsl(0 0% 98%)" /> : <Upload size={16} color="hsl(0 0% 98%)" />}
              <Text className={tab === t ? 'text-sm font-semibold text-foreground' : 'text-sm text-muted-foreground'}>
                {t === 'export' ? 'Export' : 'Import'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'export' ? (
          <View className="gap-4">
            <Text className="text-sm text-muted-foreground">
              Download a JSON backup of all <Text className="font-semibold text-foreground">{movies.length}</Text> titles in
              your library. Re-import it here or on another account.
            </Text>
            <Pressable onPress={doExport} className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3">
              <Download size={18} color="#fff" />
              <Text className="font-semibold text-primary-foreground">Export JSON</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-sm text-muted-foreground">
              Paste a Radar JSON export (or an array of titles), or pick a file. Duplicates are skipped.
            </Text>
            <Pressable
              onPress={pickFile}
              disabled={importing}
              className="flex-row items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-2.5"
            >
              <FileUp size={16} color="hsl(0 0% 98%)" />
              <Text className="text-sm font-medium text-foreground">Pick a JSON file</Text>
            </Pressable>
            <BottomSheetTextInput
              value={importText}
              onChangeText={setImportText}
              placeholder='[{"title":"Inception","type":"movie"}]'
              placeholderTextColor={MUTED}
              multiline
              editable={!importing}
              style={{ color: 'white', minHeight: 120, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
              className="rounded-lg border border-border bg-secondary px-3 py-3 text-foreground"
            />
            <Pressable
              onPress={() => runImport(importText)}
              disabled={importing || !importText.trim()}
              className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3"
              style={{ opacity: importing || !importText.trim() ? 0.6 : 1 }}
            >
              {importing && <ActivityIndicator size="small" color="#fff" />}
              <Text className="font-semibold text-primary-foreground">{importing ? 'Importing…' : 'Start import'}</Text>
            </Pressable>

            {logs.length > 0 && (
              <View className="max-h-48 gap-1 rounded-lg border border-border bg-background p-3">
                {logs.map((log, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    {log.ok ? (
                      <CheckCircle2 size={13} color="#4ade80" style={{ marginTop: 2 }} />
                    ) : (
                      <AlertCircle size={13} color="#f87171" style={{ marginTop: 2 }} />
                    )}
                    <Text className={log.ok ? 'flex-1 text-xs text-green-400' : 'flex-1 text-xs text-red-400'}>{log.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </Sheet>
  );
});
