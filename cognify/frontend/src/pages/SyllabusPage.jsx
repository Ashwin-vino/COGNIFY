import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  X,
} from 'lucide-react';
import { api } from '../services/api';

export default function SyllabusPage({ currentWorkspace, subjects, onRefreshSubjects, currentSubjectId }) {
  const [documents, setDocuments] = useState([]);
  const [syllabusEntries, setSyllabusEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Subject Form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');

  // Syllabus Entry Form
  const [showSyllabusForm, setShowSyllabusForm] = useState(false);
  const [unitNumber, setUnitNumber] = useState(1);
  const [unitTitle, setUnitTitle] = useState('');
  const [syllabusText, setSyllabusText] = useState('');

  // Upload Form
  const [selectedFile, setSelectedFile] = useState(null);
  const [category, setCategory] = useState('notes');
  const [uploadSubjectId, setUploadSubjectId] = useState(currentSubjectId || '');

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadData();
    }
  }, [currentWorkspace?.id, currentSubjectId]);

  async function loadData() {
    try {
      setLoading(true);
      const [docs, syllabus] = await Promise.all([
        api.getDocuments(currentWorkspace.id),
        api.getSyllabus(currentWorkspace.id, currentSubjectId || null),
      ]);
      setDocuments(docs || []);
      setSyllabusEntries(syllabus || []);
    } catch (err) {
      console.error('Failed to load syllabus data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubject(e) {
    e.preventDefault();
    if (!subjectName.trim()) return;
    try {
      await api.createSubject(currentWorkspace.id, {
        name: subjectName.trim(),
        code: subjectCode.trim() || null,
        description: subjectDesc.trim() || null,
      });
      setSubjectName('');
      setSubjectCode('');
      setSubjectDesc('');
      setShowSubjectForm(false);
      onRefreshSubjects();
    } catch (err) {
      alert(err.message || 'Failed to create subject');
    }
  }

  async function handleSaveSyllabus(e) {
    e.preventDefault();
    if (!syllabusText.trim()) return;
    try {
      await api.saveSyllabus(currentWorkspace.id, {
        subject_id: currentSubjectId || null,
        unit_number: unitNumber,
        unit_title: unitTitle.trim() || null,
        content_text: syllabusText.trim(),
      });
      setUnitTitle('');
      setSyllabusText('');
      setUnitNumber(prev => prev + 1);
      setShowSyllabusForm(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save syllabus entry');
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      if (uploadSubjectId) {
        formData.append('subject_id', uploadSubjectId);
      }

      await api.uploadDocument(currentWorkspace.id, formData);
      setSelectedFile(null);
      // Reset input element
      const fileInput = document.getElementById('document-file-input');
      if (fileInput) fileInput.value = '';

      await loadData();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(docId) {
    if (!window.confirm('Are you sure you want to delete this study document and its indexed chunks?')) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  }

  async function handleOpenPreview(doc) {
    try {
      setPreviewLoading(true);
      setPreviewDoc(doc);
      const textData = await api.getDocumentText(doc.id);
      setPreviewDoc(textData);
    } catch (err) {
      alert(err.message || 'Failed to fetch document text');
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Syllabus & Study Materials</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Upload notes, lecture slides, question banks, and answer keys to ground Cognify's answers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowSubjectForm(!showSubjectForm)}>
            <Plus size={16} />
            <span>Add Subject</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowSyllabusForm(!showSyllabusForm)}>
            <BookOpen size={16} />
            <span>Add Syllabus Unit</span>
          </button>
        </div>
      </div>

      {/* Subject Creator Form */}
      {showSubjectForm && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-primary)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Subject to Workspace</h3>
          <form onSubmit={handleCreateSubject}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Subject Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Operating Systems"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS302"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                placeholder="Core semester course covering processes, deadlocks, and memory management"
                value={subjectDesc}
                onChange={(e) => setSubjectDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSubjectForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Subject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Syllabus Entry Form */}
      {showSyllabusForm && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent-secondary)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Syllabus Unit</h3>
          <form onSubmit={handleSaveSyllabus}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Unit #</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(parseInt(e.target.value, 10))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Process Management and Deadlocks"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Syllabus Topics & Text *</label>
              <textarea
                className="form-textarea"
                rows="4"
                placeholder="Paste the prescribed syllabus content, topics, learning objectives, and recommended references..."
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSyllabusForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Syllabus Unit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Box */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={18} color="#6366f1" />
          <span>Upload Study Material</span>
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Supported file formats: <strong>PDF, DOCX, PPTX, TXT, MD</strong> (Max 15MB). Text is extracted and indexed on the server for grounded RAG retrieval.
        </p>

        {uploadError && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', color: '#f87171', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {uploadError}
          </div>
        )}

        <form onSubmit={handleFileUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Document Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="notes">Class Notes / Handouts</option>
                <option value="syllabus">Prescribed Syllabus</option>
                <option value="question_bank">Question Bank</option>
                <option value="answer_key">Answer Key / Solutions</option>
                <option value="previous_paper">Previous Year Paper</option>
                <option value="other">Reference Material / Textbook</option>
              </select>
            </div>

            {subjects && subjects.length > 0 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Attach to Subject</label>
                <select className="form-select" value={uploadSubjectId} onChange={(e) => setUploadSubjectId(e.target.value)}>
                  <option value="">General Workspace</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px 20px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            marginBottom: 16,
          }}>
            <input
              id="document-file-input"
              type="file"
              accept=".pdf,.docx,.pptx,.txt,.md"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              style={{ display: 'none' }}
            />
            <label htmlFor="document-file-input" className="btn btn-secondary" style={{ cursor: 'pointer', marginBottom: 8 }}>
              Choose File
            </label>
            <div style={{ fontSize: 13, color: 'var(--text-main)', marginTop: 8 }}>
              {selectedFile ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'or drag and drop your document here'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={!selectedFile || uploading}>
              {uploading ? 'Processing & Indexing Chunks...' : 'Upload & Process Material'}
            </button>
          </div>
        </form>
      </div>

      {/* Syllabus Units Display */}
      {syllabusEntries.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Prescribed Syllabus Units</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {syllabusEntries.map(entry => (
              <div key={entry.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="badge badge-grounded">Unit {entry.unit_number}</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{entry.unit_title || 'Syllabus Module'}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {entry.content_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Uploaded Study Documents ({documents.length})</h3>
      {documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
          No documents uploaded yet. Upload lecture notes or syllabus files above to enable grounded AI study.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {documents.map(doc => {
            const isReady = doc.status === 'ready';
            const isFailed = doc.status === 'failed';
            return (
              <div
                key={doc.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isReady ? 'var(--color-success)' : isFailed ? 'var(--color-danger)' : 'var(--color-warning)',
                  }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                      {doc.original_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span className="badge badge-category">{doc.category}</span>
                      <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                      {doc.page_count > 0 && <span>• {doc.page_count} pages</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isReady && (
                    <span className="badge badge-grounded" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} />
                      <span>Ready & Indexed</span>
                    </span>
                  )}
                  {isFailed && (
                    <span className="badge badge-insufficient_sources" style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={doc.extraction_error}>
                      <AlertCircle size={12} />
                      <span>Extraction Failed</span>
                    </span>
                  )}
                  {!isReady && !isFailed && (
                    <span className="badge badge-partially_grounded" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      <span>Processing...</span>
                    </span>
                  )}

                  <button className="btn btn-secondary" onClick={() => handleOpenPreview(doc)} style={{ padding: '6px 12px', fontSize: 12 }}>
                    <Eye size={14} />
                    <span>Preview Text</span>
                  </button>

                  <button className="btn-icon" onClick={() => handleDeleteDocument(doc.id)} title="Delete Document">
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Text Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content" style={{ maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>{previewDoc.originalName || 'Document Preview'}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                  {previewDoc.chunkCount ? `${previewDoc.chunkCount} indexed chunks` : ''}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setPreviewDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--text-main)',
              whiteSpace: 'pre-wrap',
            }}>
              {previewLoading ? 'Loading extracted text...' : (previewDoc.previewText || 'No text content available.')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
