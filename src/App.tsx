import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType } from './firebase';

const PLANES_PRESUPUESTO = [
  {
    nombre: 'Básico',
    rango: '$19,000 – $23,000 MXN',
    alcance: 'Muy simple: pocas secciones, lo esencial para estar en línea, perfecto para negocios nuevos',
    textoCompleto: 'Básico ($19,000 – $23,000 MXN) — Muy simple: pocas secciones, lo esencial para estar en línea, perfecto para negocios nuevos'
  },
  {
    nombre: 'Intermedio',
    rango: '$25,000 – $40,000 MXN',
    alcance: 'Profesional: diseño personalizado, más funciones, SEO base, perfecto para un negocio establecido',
    textoCompleto: 'Intermedio ($25,000 – $40,000 MXN) — Profesional: diseño personalizado, más funciones, SEO base, perfecto para un negocio establecido'
  },
  {
    nombre: 'Premium',
    rango: '$45,000 MXN en adelante',
    alcance: 'Nivel internacional: diseño a la medida, multilenguaje, alto rendimiento, SEO avanzado, perfecto para multinacionales',
    textoCompleto: 'Premium ($45,000 MXN en adelante) — Nivel internacional: diseño a la medida, multilenguaje, alto rendimiento, SEO avanzado, perfecto para multinacionales'
  }
];

export default function App() {
  // Datos de contacto
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');

  // Preguntas del Brief
  const [p1Giro, setP1Giro] = useState('');
  const [p2Diferenciador, setP2Diferenciador] = useState('');
  const [p3Objetivo, setP3Objetivo] = useState('');
  const [p4Exito, setP4Exito] = useState('');
  const [p4ExitoOtro, setP4ExitoOtro] = useState('');
  const [p5SitioActual, setP5SitioActual] = useState('');
  const [p5SitioDetalle, setP5SitioDetalle] = useState('');
  const [p6Recursos, setP6Recursos] = useState<string[]>([]);
  const [p7TipoTamano, setP7TipoTamano] = useState('');
  const [p8Funciones, setP8Funciones] = useState<string[]>([]);
  const [p8FuncionesOtra, setP8FuncionesOtra] = useState('');
  const [p9Contenido, setP9Contenido] = useState('');
  const [p10GoogleSeo, setP10GoogleSeo] = useState('');
  const [p11Referencias, setP11Referencias] = useState('');
  const [p12Sensaciones, setP12Sensaciones] = useState<string[]>([]);
  const [p13Presupuesto, setP13Presupuesto] = useState('');
  const [p14Tiempo, setP14Tiempo] = useState('');
  const [p16Mantenimiento, setP16Mantenimiento] = useState('');

  // Estados de interfaz
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pantalla de presentación (Splash Screen)
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const handleDismissSplash = () => {
    setSplashFading(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 600);
  };

  useEffect(() => {
    testConnection();

    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 2800);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 15) {
        handleDismissSplash();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const toggleMultiSelect = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    maxLimit?: number
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      if (!maxLimit || list.length < maxLimit) {
        setList([...list, value]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorMessage('Por favor, indica tu nombre o el de la persona de contacto.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    if (!p1Giro.trim()) {
      setErrorMessage('Por favor, responde a qué se dedica tu empresa en la pregunta 1.');
      return;
    }

    setLoading(true);

    try {
      const uniqueId = `brief_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Estructura plana ordenada numéricamente del 01 al 16
      // Para que en la consola de Firebase se ordene exactamente en secuencia
      const payload: Record<string, unknown> = {
        cliente_nombre: nombreLimpio,
        cliente_empresa: empresa.trim() || 'No especificado',
        cliente_contacto: contacto.trim() || 'No especificado',

        '01_giro_y_audiencia': p1Giro.trim(),
        '02_diferenciador': p2Diferenciador.trim() || 'No especificado',
        '03_objetivo_principal': p3Objetivo || 'No especificado',
        '04_medicion_de_exito':
          p4Exito === 'Otro' && p4ExitoOtro.trim()
            ? `Otro: ${p4ExitoOtro.trim()}`
            : p4Exito || 'No especificado',
        '05_sitio_web_actual':
          p5SitioActual === 'Sí y quiero rediseñar' && p5SitioDetalle.trim()
            ? `Sí y quiero rediseñar: ${p5SitioDetalle.trim()}`
            : p5SitioActual || 'No especificado',
        '06_recursos_con_que_cuentan':
          p6Recursos.length > 0 ? p6Recursos : ['Ninguno marcado'],
        '07_tipo_y_tamano_de_sitio': p7TipoTamano || 'No especificado',
        '08_funciones_requeridas': (() => {
          const list = [...p8Funciones];
          if (p8FuncionesOtra.trim()) list.push(`Otra: ${p8FuncionesOtra.trim()}`);
          return list.length > 0 ? list : ['Ninguna marcada'];
        })(),
        '09_produccion_de_contenido': p9Contenido || 'No especificado',
        '10_importancia_google_y_publicidad': p10GoogleSeo || 'No especificado',
        '11_sitios_de_referencia': p11Referencias.trim() || 'No especificado',
        '12_sensacion_de_marca':
          p12Sensaciones.length > 0 ? p12Sensaciones : ['Ninguna marcada'],
        '13_presupuesto_estimado': p13Presupuesto || 'No especificado',
        '14_tiempo_de_entrega': p14Tiempo || 'No especificado',
        '16_mantenimiento_posterior': p16Mantenimiento || 'No especificado',

        fecha_envio: new Date().toLocaleString('es-MX', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'responses', uniqueId), payload);

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error('Error al guardar el cuestionario:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'responses');
      } catch {
        setErrorMessage('Ocurrió un error al enviar el cuestionario. Por favor intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setNombre('');
    setEmpresa('');
    setContacto('');
    setP1Giro('');
    setP2Diferenciador('');
    setP3Objetivo('');
    setP4Exito('');
    setP4ExitoOtro('');
    setP5SitioActual('');
    setP5SitioDetalle('');
    setP6Recursos([]);
    setP7TipoTamano('');
    setP8Funciones([]);
    setP8FuncionesOtra('');
    setP9Contenido('');
    setP10GoogleSeo('');
    setP11Referencias('');
    setP12Sensaciones([]);
    setP13Presupuesto('');
    setP14Tiempo('');
    setP16Mantenimiento('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#edf5fc] text-slate-800 flex flex-col justify-between selection:bg-sky-200 selection:text-sky-950 relative">
      {/* Pantalla de presentación (Splash Screen) en #12302c */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex flex-col justify-between items-center px-6 py-12 md:py-16 transition-opacity duration-600 ease-in-out select-none ${
            splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            backgroundColor: '#12302c',
            fontFamily: '"Helvetica World", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
          }}
        >
          <div className="w-full h-4"></div>

          {/* Bloque central: [ 102 Studio ] y Web Development */}
          <div className="text-center px-4 flex flex-col items-center">
            <h1 className="text-lg sm:text-xl md:text-2xl font-light tracking-[0.32em] text-white uppercase select-none mb-2.5">
              [ 102 Studio ]
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-xs font-light tracking-[0.35em] text-white/90 uppercase select-none">
              Web Development
            </p>
          </div>

          {/* Zona inferior: Flecha indicadora sin caja + Nombre del autor */}
          <div className="w-full flex flex-col items-center space-y-6 md:space-y-8 pb-2 sm:pb-4">
            <button
              type="button"
              onClick={handleDismissSplash}
              aria-label="Saltar al cuestionario"
              className="text-white/80 hover:text-white transition-opacity active:translate-y-1 animate-bounce cursor-pointer p-2 bg-transparent border-none outline-none"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <polyline points="18 14 12 20 6 14"></polyline>
              </svg>
            </button>

            <p className="text-[9px] sm:text-[10px] md:text-[11px] font-light tracking-[0.26em] text-white/80 uppercase select-none">
              Abiel Vazquez Martinez
            </p>
          </div>
        </div>
      )}

      {/* Cabecera superior con marca en negativo sin cajas */}
      <header className="w-full pt-10 pb-6 px-6 md:px-12">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span
            className="text-xs md:text-sm font-semibold tracking-[0.3em] text-slate-900 uppercase select-none"
            style={{
              fontFamily: '"Helvetica World", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
          >
            [ 102 Studio ]
          </span>
          <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-light">
            Brief de Proyecto
          </span>
        </div>
      </header>

      {/* Cuerpo principal abierto y sin cajas encapsuladas */}
      <main className="max-w-2xl w-full mx-auto px-6 md:px-8 py-10 md:py-16 flex-1">
        {/* Título Principal */}
        <section className="mb-14 md:mb-20">

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-slate-950 tracking-tight leading-tight mb-4">
            Diseñemos tu Sitio Web
          </h1>
          <p className="text-slate-600 text-base md:text-lg font-light leading-relaxed max-w-xl">
            Completa esta guía para definir las bases, requerimientos técnicos, estilo y objetivos de tu proyecto digital.
          </p>
        </section>

        {submitted ? (
          /* Confirmación minimalista: Sin cajas, en el espacio blanco */
          <section className="py-6 space-y-10">
            <div>
              <p className="text-xs tracking-[0.25em] text-sky-800 uppercase mb-2 font-medium">
                Cuestionario Recibido
              </p>
              <h2 className="text-3xl font-light text-slate-950 mb-3">
                Gracias, {nombre}.
              </h2>
              <p className="text-slate-600 font-light leading-relaxed text-base">
                Hemos recibido todas las especificaciones de tu sitio web de forma ordenada en la base de datos de Firebase. Analizaremos tu información para preparar una propuesta personalizada.
              </p>
            </div>

            <div className="border-t border-sky-300/60 pt-6">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-medium tracking-wide text-slate-950 border-b-2 border-slate-950 pb-1 hover:text-sky-800 hover:border-sky-800 transition-colors cursor-pointer"
              >
                Enviar otro formulario
              </button>
            </div>
          </section>
        ) : (
          /* Formulario abierto sin cajas contenedoras */
          <form onSubmit={handleSubmit} className="space-y-16 md:space-y-24">
            {errorMessage && (
              <p className="text-sm text-red-600 tracking-wide border-l-2 border-red-500 pl-3 py-1">
                {errorMessage}
              </p>
            )}

            {/* SECCIÓN 0: Datos de Contacto */}
            <div className="space-y-8">
              <h2 className="text-xs uppercase tracking-[0.28em] text-sky-900 font-semibold border-b border-sky-200 pb-2">
                Información de Contacto
              </h2>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">
                  Nombre completo <span className="text-sky-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre..."
                  className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-xl text-slate-950 placeholder:text-slate-400/80 py-2.5 outline-none transition-colors font-light"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">
                  Empresa o Negocio
                </label>
                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Nombre de tu marca o empresa..."
                  className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-xl text-slate-950 placeholder:text-slate-400/80 py-2.5 outline-none transition-colors font-light"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">
                  WhatsApp o Correo Electrónico
                </label>
                <input
                  type="text"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Para enviarte la propuesta y cotización..."
                  className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-xl text-slate-950 placeholder:text-slate-400/80 py-2.5 outline-none transition-colors font-light"
                />
              </div>
            </div>

            {/* SECCIÓN 1: Tu negocio y tu objetivo */}
            <div className="space-y-12">
              <h2 className="text-xs uppercase tracking-[0.28em] text-sky-900 font-semibold border-b border-sky-200 pb-2">
                Tu negocio y tu objetivo
              </h2>

              {/* Pregunta 1 */}
              <div className="space-y-2">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  1. ¿A qué se dedica tu empresa y a quién le vende? <span className="text-sky-700">*</span>
                </label>
                <p className="text-xs text-slate-500 font-light">
                  (Giro, tipo de cliente: empresas o consumidores, y zona: local, nacional o internacional)
                </p>
                <textarea
                  rows={3}
                  required
                  value={p1Giro}
                  onChange={(e) => setP1Giro(e.target.value)}
                  placeholder="Describe a qué te dedicas, tus clientes ideales y tu alcance..."
                  className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-base md:text-lg text-slate-950 placeholder:text-slate-400/80 py-2.5 outline-none transition-colors resize-none font-light leading-relaxed"
                />
              </div>

              {/* Pregunta 2 */}
              <div className="space-y-2">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  2. ¿Qué te diferencia de tu competencia? <span className="text-slate-500 font-light">(1 o 2 frases)</span>
                </label>
                <input
                  type="text"
                  value={p2Diferenciador}
                  onChange={(e) => setP2Diferenciador(e.target.value)}
                  placeholder="Tu propuesta de valor o factor distintivo..."
                  className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-base md:text-lg text-slate-950 placeholder:text-slate-400/80 py-2.5 outline-none transition-colors font-light"
                />
              </div>

              {/* Pregunta 3 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  3. ¿Cuál es el objetivo principal de la página?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Generar contactos o cotizaciones',
                    'Vender en línea',
                    'Mostrar catálogo o portafolio',
                    'Dar credibilidad y presencia de marca',
                  ].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setP3Objetivo(opcion)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p3Objetivo === opcion
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p3Objetivo === opcion ? `● ${opcion}` : `○ ${opcion}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pregunta 4 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  4. ¿Cómo medirías que la página fue un éxito en 6 meses?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Más mensajes o llamadas',
                    'Ventas en línea',
                    'Mejorar la imagen frente a clientes grandes o del extranjero',
                    'Posicionarse en Google',
                    'Otro',
                  ].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setP4Exito(opcion)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p4Exito === opcion
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p4Exito === opcion ? `● ${opcion}` : `○ ${opcion}`}
                    </button>
                  ))}
                </div>
                {p4Exito === 'Otro' && (
                  <input
                    type="text"
                    value={p4ExitoOtro}
                    onChange={(e) => setP4ExitoOtro(e.target.value)}
                    placeholder="Escribe cómo medirías el éxito..."
                    className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-sm text-slate-950 py-2 outline-none font-light mt-2"
                  />
                )}
              </div>
            </div>

            {/* SECCIÓN 2: Situación actual */}
            <div className="space-y-12">
              <h2 className="text-xs uppercase tracking-[0.28em] text-sky-900 font-semibold border-b border-sky-200 pb-2">
                Situación actual
              </h2>

              {/* Pregunta 5 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  5. ¿Ya tienes sitio web?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'No',
                    'Sí y quiero rediseñar',
                    'Sí y quiero uno nuevo desde cero',
                  ].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setP5SitioActual(opcion)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p5SitioActual === opcion
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p5SitioActual === opcion ? `● ${opcion}` : `○ ${opcion}`}
                    </button>
                  ))}
                </div>
                {p5SitioActual === 'Sí y quiero rediseñar' && (
                  <input
                    type="text"
                    value={p5SitioDetalle}
                    onChange={(e) => setP5SitioDetalle(e.target.value)}
                    placeholder="¿Qué es lo que no te gusta o deseas cambiar de tu sitio actual?..."
                    className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-sm text-slate-950 py-2 outline-none font-light mt-2"
                  />
                )}
              </div>

              {/* Pregunta 6 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  6. ¿Con qué cuentan hoy en día? <span className="text-slate-500 font-light">(marca todo lo que aplique)</span>
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  {[
                    'Dominio (nombre web con un punto com)',
                    'Hosting (alojamiento web)',
                    'Logotipo',
                    'Manual de marca (colores y tipografías)',
                    'Fotos y Vídeos del negocio',
                  ].map((recurso) => {
                    const isSelected = p6Recursos.includes(recurso);
                    return (
                      <button
                        key={recurso}
                        type="button"
                        onClick={() => toggleMultiSelect(p6Recursos, setP6Recursos, recurso)}
                        className={`text-xs tracking-wider transition-all py-1.5 px-0 font-normal border-b cursor-pointer ${
                          isSelected
                            ? 'border-slate-950 text-slate-950 font-medium'
                            : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? `✓ ${recurso}` : `+ ${recurso}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Alcance y funciones web */}
            <div className="space-y-12">
              <h2 className="text-xs uppercase tracking-[0.28em] text-sky-900 font-semibold border-b border-sky-200 pb-2">
                Alcance y funciones web
              </h2>

              {/* Pregunta 7 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  7. ¿Qué tipo de sitio necesitas y de qué tamaño?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Landing de 1 página (una sola web estática)',
                    'Informativo de 2 a 5 páginas',
                    'Corporativo de 6 a 10 páginas',
                    'Más de 10 páginas o catálogo extenso',
                    'Tienda en línea con opción de compra',
                  ].map((tamano) => (
                    <button
                      key={tamano}
                      type="button"
                      onClick={() => setP7TipoTamano(tamano)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p7TipoTamano === tamano
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p7TipoTamano === tamano ? `● ${tamano}` : `○ ${tamano}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pregunta 8 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  8. ¿Qué funciones necesitas? <span className="text-slate-500 font-light">(marca todas las que apliquen)</span>
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  {[
                    'Formulario de contacto',
                    'Botón de WhatsApp',
                    'Pagos en línea',
                    'Reservas o citas',
                    'Blog',
                    'Versión en inglés u otros idiomas',
                    'Panel para editar contenido yo mismo',
                    'Cotizador o calculadora',
                    'Área de clientes (login)',
                    'Integración con CRM, correo o redes sociales',
                  ].map((funcion) => {
                    const isSelected = p8Funciones.includes(funcion);
                    return (
                      <button
                        key={funcion}
                        type="button"
                        onClick={() => toggleMultiSelect(p8Funciones, setP8Funciones, funcion)}
                        className={`text-xs tracking-wider transition-all py-1.5 px-0 font-normal border-b cursor-pointer ${
                          isSelected
                            ? 'border-slate-950 text-slate-950 font-medium'
                            : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? `✓ ${funcion}` : `+ ${funcion}`}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <input
                    type="text"
                    value={p8FuncionesOtra}
                    onChange={(e) => setP8FuncionesOtra(e.target.value)}
                    placeholder="Otra función requerida (opcional)..."
                    className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-sm text-slate-950 py-2 outline-none font-light"
                  />
                </div>
              </div>

              {/* Pregunta 9 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  9. ¿Quién proporcionará textos, fotos y videos?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Yo los entrego',
                    'Necesito ayuda en la redacción y producción',
                    'Una mezcla de ambos',
                  ].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setP9Contenido(opcion)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p9Contenido === opcion
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p9Contenido === opcion ? `● ${opcion}` : `○ ${opcion}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pregunta 10 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  10. ¿Qué tanta importancia tiene Google y la publicidad digital?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Básico: que aparezca en google',
                    'Importante: que me encuentren por mis servicios',
                    'Prioridad: competir por primeras posiciones y correr campañas pagadas',
                  ].map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setP10GoogleSeo(opcion)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p10GoogleSeo === opcion
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p10GoogleSeo === opcion ? `● ${opcion}` : `○ ${opcion}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: Estilo y referencias */}
            <div className="space-y-12">
              <h2 className="text-xs uppercase tracking-[0.28em] text-sky-900 font-semibold border-b border-sky-200 pb-2">
                Estilo y referencias
              </h2>

              {/* Pregunta 11 */}
              <div className="space-y-2">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  11. Comparte 2 o 3 sitios que te gusten y qué te gusta de cada uno
                </label>
                <p className="text-xs text-slate-500 font-light">
                  (Pueden ser sitios tuyos, de tu competencia o de cualquier otro giro)
                </p>
                <textarea
                  rows={3}
                  value={p11Referencias}
                  onChange={(e) => setP11Referencias(e.target.value)}
                  placeholder="Ej: apple.com (la tipografía y limpieza), stripe.com (las animaciones y claridad)..."
                  className="w-full bg-transparent border-b border-sky-300/80 focus:border-slate-900 text-base md:text-lg text-slate-950 placeholder:text-slate-400/80 py-2.5 outline-none transition-colors resize-none font-light leading-relaxed"
                />
              </div>

              {/* Pregunta 12 */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  12. ¿Qué sensación debe transmitir tu marca? <span className="text-slate-500 font-light">(elige hasta 2)</span>
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  {[
                    'Profesional y corporativa',
                    'Moderna y tecnológica',
                    'Cercana y amigable',
                    'Premium y exclusiva',
                    'Industrial y robusta',
                  ].map((sensacion) => {
                    const isSelected = p12Sensaciones.includes(sensacion);
                    return (
                      <button
                        key={sensacion}
                        type="button"
                        onClick={() => toggleMultiSelect(p12Sensaciones, setP12Sensaciones, sensacion, 2)}
                        className={`text-xs tracking-wider transition-all py-1.5 px-0 font-normal border-b cursor-pointer ${
                          isSelected
                            ? 'border-slate-950 text-slate-950 font-medium'
                            : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? `✓ ${sensacion}` : `+ ${sensacion}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: Presupuesto, tiempos y operación */}
            <div className="space-y-12">
              <h2 className="text-xs uppercase tracking-[0.28em] text-sky-900 font-semibold border-b border-sky-200 pb-2">
                Presupuesto, tiempos y operación
              </h2>

              {/* Pregunta 13: Presupuesto estimado */}
              <div className="space-y-4">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  13. ¿Cuál es tu presupuesto estimado?
                </label>
                <div className="space-y-4 pt-1">
                  {PLANES_PRESUPUESTO.map((plan) => {
                    const isSelected = p13Presupuesto === plan.textoCompleto;
                    return (
                      <div
                        key={plan.nombre}
                        onClick={() => setP13Presupuesto(plan.textoCompleto)}
                        className={`cursor-pointer pb-3 pt-1 border-b transition-colors ${
                          isSelected ? 'border-slate-950' : 'border-sky-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-baseline justify-between mb-1">
                          <span className={`text-sm ${isSelected ? 'font-medium text-slate-950' : 'text-slate-800'}`}>
                            {isSelected ? '● ' : '○ '} {plan.nombre}
                          </span>
                          <span className="text-xs font-medium text-sky-900 tracking-wide">
                            {plan.rango}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-light leading-relaxed pl-4">
                          {plan.alcance}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pregunta 14: Tiempos */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  14. ¿Para cuándo lo necesitas?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Menos de 3 semanas',
                    '1 a 2 meses',
                    'Sin prisa',
                  ].map((tiempo) => (
                    <button
                      key={tiempo}
                      type="button"
                      onClick={() => setP14Tiempo(tiempo)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p14Tiempo === tiempo
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p14Tiempo === tiempo ? `● ${tiempo}` : `○ ${tiempo}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pregunta 16: Mantenimiento */}
              <div className="space-y-3">
                <label className="block text-sm text-slate-900 font-normal leading-snug">
                  16. Después de publicar, ¿quién dará mantenimiento y actualizaciones?
                </label>
                <div className="space-y-2 pt-1">
                  {[
                    'Lo haré yo mismo',
                    'Quiero que lo hagan ustedes (soporte mensual)',
                    'No lo sé aún',
                  ].map((mant) => (
                    <button
                      key={mant}
                      type="button"
                      onClick={() => setP16Mantenimiento(mant)}
                      className={`block text-left text-xs sm:text-sm py-1.5 transition-colors border-b cursor-pointer ${
                        p16Mantenimiento === mant
                          ? 'border-slate-950 text-slate-950 font-medium'
                          : 'border-transparent text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {p16Mantenimiento === mant ? `● ${mant}` : `○ ${mant}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botón de envío limpio */}
            <div className="pt-8 border-t border-sky-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-10 py-4 bg-slate-950 hover:bg-slate-800 text-white text-xs md:text-sm uppercase tracking-[0.22em] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Enviando información...' : 'Enviar cuestionario'}
              </button>
              <p className="text-[11px] text-slate-400 font-light mt-4">
                La información se envía de forma privada directamente a la base de datos de [ 102 Studio ].
              </p>
            </div>
          </form>
        )}
      </main>

      {/* Pie de página con espacio blanco y la firma de [ 102 Studio ] */}
      <footer className="w-full py-10 px-6 md:px-12 mt-16">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span
            className="tracking-[0.28em] text-slate-900 uppercase font-semibold select-none"
            style={{
              fontFamily: '"Helvetica World", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
          >
            [ 102 Studio ]
          </span>
          <p className="text-slate-500 font-light tracking-wide">
            Web Development • Respuestas privadas en Firestore
          </p>
        </div>
      </footer>
    </div>
  );
}
