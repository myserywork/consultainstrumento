import mongoose from 'mongoose';

export const InstrumentoSchema = new mongoose.Schema({
    numeroConvenio: { type: String, required: true },
    numero: { type: String, required: true },
    processoExecucao: { type: String, required: true },
    dataPublicacao: { type: String, required: true },
    numeroProcesso: { type: String, required: true },
    situacao: { type: String, required: true },
    situacaoOrigem: { type: String, required: true },
    sistemaOrigem: { type: String, required: true },
    aceiteExecucao: { type: String, required: true },
    dataEnvioAceite: { type: String },
    usuario: { type: String, required: true },
    environment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const InstrumentoModel = mongoose.model('Instrumento', InstrumentoSchema);

export default InstrumentoModel;
