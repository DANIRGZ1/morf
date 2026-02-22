import { useState, useRef, useEffect, createContext, useContext } from "react";
import { mergePdfs, splitPdf, imagesToPdf, compressPdf, wordToPdf, pdfToWord, pngToJpg, jpgToPng, rotatePdf, excelToPdf } from "./utils/convert";

/* ── i18n ─────────────────────────────────────────────────────────────────── */
const LANGS = {
  es: {
    code:"es", flag:"🇪🇸", name:"Español",
    tagline:"Sin registro · Sin marcas de agua · 100% privado",
    hero_h1a:"La forma más rápida de", hero_h1b:"convertir tus archivos.",
    hero_sub:"PDF, Word, Excel, imágenes. Todo gratis, sin registro y sin que tus archivos salgan de tu navegador.",
    hero_cta:"Empezar ahora — es gratis",
    hero_drop:"Arrastra cualquier archivo aquí",
    hero_drop_sub:"Selección automática de herramienta",
    tools_title:"Herramientas", tools_count:"disponibles",
    detected:"Detectado",
    unknown_fmt:"Formato no reconocido",
    incompat:"Formato no compatible",
    drag_single:"Arrastra tu archivo aquí",
    drag_multi:"Arrastra tus archivos aquí",
    click_hint:"o haz clic",
    processing:"Procesando…",
    convert:"Convertir", cancel:"Cancelar",
    download:"Descargar", other:"Otro archivo",
    done_title:"Listo para descargar",
    done_sub_s:"archivo procesado", done_sub_p:"archivos procesados",
    conv_done:"Conversión completada",
    dl_started:"Descarga iniciada",
    pages_label:"Rango de páginas (ej: 1-3, 5, 7-9)",
    pages_ph:"Vacío = todas las páginas",
    compress_level:"Nivel de compresión",
    q_low:"Suave", q_med:"Media", q_high:"Máxima",
    feat:[ ["Procesado local","Tus archivos no salen del navegador."],
           ["Formato conservado","Fuentes, márgenes y tablas intactos."],
           ["Descarga inmediata","Resultado listo en segundos."],
           ["Sin límites","Archivos de hasta 200 MB."] ],
    max_size:"máx. 200 MB",
    counter:"archivos convertidos",
    step_read:"Leyendo archivo…", step_proc:"Procesando…", step_done:"¡Listo!",
    hist_title:"Conversiones recientes", hist_empty:"Aún no has convertido ningún archivo.", hist_clear:"Borrar historial",
    nav_privacy:"Privacidad", nav_api:"API", nav_help:"Ayuda",
    footer_copy:"morf · © 2025",
    modal_privacy:"Política de Privacidad", modal_terms:"Términos de Uso",
    modal_contact:"Contacto", modal_api:"API de morf",
    err_title:"No se pudo completar la conversión",
    err_retry:"Reintentar",
    err_size:"El archivo supera el límite de 200 MB. Prueba con un archivo más pequeño.",
    err_protected:"El PDF está protegido con contraseña. Desprotégelo antes de convertir.",
    err_corrupt:"El archivo parece estar dañado o no es un formato válido.",
    err_range:"El rango de páginas no es válido. Usa el formato 1-3, 5, 7-9.",
    err_popup:"El navegador bloqueó la ventana emergente. Permite las ventanas emergentes e inténtalo de nuevo.",
    err_generic:"Ha ocurrido un error inesperado. Comprueba que el archivo no está dañado e inténtalo de nuevo.",
    err_suggest:"¿Sigue fallando? Escríbenos a hola@morf.app",
    err_odt:"Formato ODT detectado. Ábrelo en LibreOffice y guárdalo como .docx (Archivo → Guardar como → Word 2007-365) e inténtalo de nuevo.",
    // tools
    t:[ {label:"PDF → Word",    desc:"Convierte PDF a documento Word editable."},
        {label:"Word → PDF",    desc:"Transforma Word a PDF de alta fidelidad."},
        {label:"Imagen → PDF",  desc:"Agrupa JPG, PNG o WEBP en un único PDF."},
        {label:"Unir PDFs",     desc:"Fusiona varios PDFs respetando el orden."},
        {label:"Dividir PDF",   desc:"Extrae páginas o rangos de cualquier PDF."},
        {label:"Comprimir PDF", desc:"Reduce el tamaño sin pérdida visible de calidad."},
        {label:"PNG → JPG",     desc:"Convierte imágenes PNG a formato JPG."},
        {label:"JPG → PNG",     desc:"Convierte imágenes JPG a formato PNG."},
        {label:"Rotar PDF",     desc:"Rota páginas de un PDF 90°, 180° o 270°."},
        {label:"Excel → PDF",   desc:"Convierte hojas de cálculo Excel a PDF."} ],
    // contact
    con_intro:"¿Tienes alguna duda o incidencia? Escríbenos y te respondemos en menos de 48h laborables.",
    con_name:"Nombre", con_email:"Email", con_subject:"Asunto", con_msg:"Mensaje",
    con_name_ph:"Tu nombre", con_email_ph:"tu@email.com", con_msg_ph:"Cuéntanos en detalle...",
    con_subjects:[["general","Consulta general"],["bug","Reportar un error"],["feature","Sugerencia"],["api","Acceso a la API"],["legal","Asunto legal"]],
    con_send:"Enviar mensaje", con_sending:"Enviando…", con_cancel:"Cancelar",
    con_done_title:"Mensaje recibido",
    con_done_sub:"Respondemos en menos de 48 horas en días laborables.",
    con_close:"Cerrar", con_required:"Rellena todos los campos",
    con_sent:"Mensaje enviado",
    con_resp_t:"Respuesta", con_resp_v:"< 48h laborables",
    // privacy
    priv_chips:["Sin seguimiento","Procesado local","Sin almacenamiento"],
    // api
    api_beta:"API en beta privada. Solicita acceso desde el formulario de contacto.",
    api_copy:"Copiar", api_copied:"✓ Copiado",
    api_plans:[{t:"Free",r:"50 req/mes",s:"10 MB",p:"Gratis"},{t:"Pro",r:"5.000 req/mes",s:"100 MB",p:"€19/mes"},{t:"Business",r:"Ilimitado",s:"500 MB",p:"€99/mes"}],
  },
  en: {
    code:"en", flag:"🇬🇧", name:"English",
    tagline:"No signup · No watermarks · 100% private",
    hero_h1a:"The fastest way to", hero_h1b:"convert your files.",
    hero_sub:"PDF, Word, Excel, images. All free, no sign-up, and your files never leave your browser.",
    hero_cta:"Start now — it's free",
    hero_drop:"Drop any file here",
    hero_drop_sub:"Automatic tool detection",
    tools_title:"Tools", tools_count:"available",
    detected:"Detected",
    unknown_fmt:"Format not recognised",
    incompat:"Incompatible format",
    drag_single:"Drop your file here",
    drag_multi:"Drop your files here",
    click_hint:"or click to browse",
    processing:"Processing…",
    convert:"Convert", cancel:"Cancel",
    download:"Download", other:"Convert another",
    done_title:"Ready to download",
    done_sub_s:"file processed", done_sub_p:"files processed",
    conv_done:"Conversion complete",
    dl_started:"Download started",
    pages_label:"Page range (e.g. 1-3, 5, 7-9)",
    pages_ph:"Empty = all pages",
    compress_level:"Compression level",
    q_low:"Light", q_med:"Medium", q_high:"Maximum",
    feat:[ ["Local processing","Your files never leave your browser."],
           ["Format preserved","Fonts, margins and tables intact."],
           ["Instant download","Result ready in seconds."],
           ["No limits","Files up to 200 MB."] ],
    max_size:"max. 200 MB",
    counter:"files converted",
    step_read:"Reading file…", step_proc:"Processing…", step_done:"Done!",
    hist_title:"Recent conversions", hist_empty:"You haven't converted any files yet.", hist_clear:"Clear history",
    nav_privacy:"Privacy", nav_api:"API", nav_help:"Help",
    footer_copy:"morf · © 2025",
    modal_privacy:"Privacy Policy", modal_terms:"Terms of Use",
    modal_contact:"Contact", modal_api:"morf API",
    err_title:"Conversion failed",
    err_retry:"Try again",
    err_size:"File exceeds the 200 MB limit. Please use a smaller file.",
    err_protected:"This PDF is password-protected. Remove the password before converting.",
    err_corrupt:"The file appears to be corrupted or is not a valid format.",
    err_range:"Invalid page range. Use the format 1-3, 5, 7-9.",
    err_popup:"The browser blocked the pop-up window. Allow pop-ups for this site and try again.",
    err_generic:"An unexpected error occurred. Check the file is not corrupted and try again.",
    err_suggest:"Still not working? Email us at hola@morf.app",
    err_odt:"ODT format detected. Open it in LibreOffice and save as .docx (File → Save As → Word 2007-365) then try again.",
    t:[ {label:"PDF → Word",    desc:"Convert PDF to an editable Word document."},
        {label:"Word → PDF",    desc:"Turn Word documents into high-fidelity PDFs."},
        {label:"Image → PDF",   desc:"Bundle JPG, PNG or WEBP files into one PDF."},
        {label:"Merge PDFs",    desc:"Combine multiple PDFs keeping the order."},
        {label:"Split PDF",     desc:"Extract pages or ranges from any PDF."},
        {label:"Compress PDF",  desc:"Reduce file size with no visible quality loss."},
        {label:"PNG → JPG",     desc:"Convert PNG images to JPG format."},
        {label:"JPG → PNG",     desc:"Convert JPG images to PNG format."},
        {label:"Rotate PDF",    desc:"Rotate PDF pages 90°, 180° or 270°."},
        {label:"Excel → PDF",   desc:"Convert Excel spreadsheets to PDF."} ],
    con_intro:"Got a question or issue? Write to us and we'll reply within 48 business hours.",
    con_name:"Name", con_email:"Email", con_subject:"Subject", con_msg:"Message",
    con_name_ph:"Your name", con_email_ph:"you@email.com", con_msg_ph:"Tell us in detail...",
    con_subjects:[["general","General enquiry"],["bug","Report a bug"],["feature","Feature request"],["api","API access"],["legal","Legal matter"]],
    con_send:"Send message", con_sending:"Sending…", con_cancel:"Cancel",
    con_done_title:"Message received",
    con_done_sub:"We reply within 48 business hours. Check your spam folder just in case.",
    con_close:"Close", con_required:"Please fill in all fields",
    con_sent:"Message sent",
    con_resp_t:"Response time", con_resp_v:"< 48 business hours",
    priv_chips:["No tracking","Local processing","No storage"],
    api_beta:"API is in private beta. Request access from the contact form.",
    api_copy:"Copy", api_copied:"✓ Copied",
    api_plans:[{t:"Free",r:"50 req/mo",s:"10 MB",p:"Free"},{t:"Pro",r:"5,000 req/mo",s:"100 MB",p:"€19/mo"},{t:"Business",r:"Unlimited",s:"500 MB",p:"€99/mo"}],
  },
  fr: {
    code:"fr", flag:"🇫🇷", name:"Français",
    tagline:"Sans inscription · Sans filigrane · 100% privé",
    hero_h1a:"La façon la plus rapide de", hero_h1b:"convertir vos fichiers.",
    hero_sub:"PDF, Word, Excel, images. Tout gratuit, sans inscription, vos fichiers restent dans votre navigateur.",
    hero_cta:"Commencer — c'est gratuit",
    hero_drop:"Déposez n'importe quel fichier ici",
    hero_drop_sub:"Détection automatique de l'outil",
    tools_title:"Outils", tools_count:"disponibles",
    detected:"Détecté",
    unknown_fmt:"Format non reconnu",
    incompat:"Format incompatible",
    drag_single:"Déposez votre fichier ici",
    drag_multi:"Déposez vos fichiers ici",
    click_hint:"ou cliquez pour parcourir",
    processing:"Traitement…",
    convert:"Convertir", cancel:"Annuler",
    download:"Télécharger", other:"Autre fichier",
    done_title:"Prêt à télécharger",
    done_sub_s:"fichier traité", done_sub_p:"fichiers traités",
    conv_done:"Conversion terminée",
    dl_started:"Téléchargement démarré",
    pages_label:"Plage de pages (ex : 1-3, 5, 7-9)",
    pages_ph:"Vide = toutes les pages",
    compress_level:"Niveau de compression",
    q_low:"Légère", q_med:"Moyenne", q_high:"Maximum",
    feat:[ ["Traitement local","Vos fichiers ne quittent pas le navigateur."],
           ["Format conservé","Polices, marges et tableaux intacts."],
           ["Téléchargement immédiat","Résultat prêt en quelques secondes."],
           ["Sans limite","Fichiers jusqu'à 200 Mo."] ],
    max_size:"max. 200 Mo",
    counter:"fichiers convertis",
    step_read:"Lecture du fichier…", step_proc:"Traitement…", step_done:"Terminé !",
    hist_title:"Conversions récentes", hist_empty:"Vous n'avez pas encore converti de fichiers.", hist_clear:"Effacer l'historique",
    nav_privacy:"Confidentialité", nav_api:"API", nav_help:"Aide",
    footer_copy:"morf · © 2025",
    modal_privacy:"Politique de confidentialité", modal_terms:"Conditions d'utilisation",
    modal_contact:"Contact", modal_api:"API morf",
    err_title:"La conversion a échoué",
    err_retry:"Réessayer",
    err_size:"Le fichier dépasse la limite de 200 Mo. Essayez avec un fichier plus petit.",
    err_protected:"Ce PDF est protégé par un mot de passe. Supprimez-le avant de convertir.",
    err_corrupt:"Le fichier semble corrompu ou n'est pas dans un format valide.",
    err_range:"Plage de pages invalide. Utilisez le format 1-3, 5, 7-9.",
    err_popup:"Le navigateur a bloqué la fenêtre contextuelle. Autorisez les popups et réessayez.",
    err_generic:"Une erreur inattendue s'est produite. Vérifiez que le fichier n'est pas corrompu.",
    err_suggest:"Toujours un problème ? Écrivez-nous à hola@morf.app",
    err_odt:"Format ODT détecté. Ouvrez-le dans LibreOffice et enregistrez-le en .docx (Fichier → Enregistrer sous → Word 2007-365) puis réessayez.",
    t:[ {label:"PDF → Word",      desc:"Convertit un PDF en document Word éditable."},
        {label:"Word → PDF",      desc:"Transforme Word en PDF haute fidélité."},
        {label:"Image → PDF",     desc:"Regroupe JPG, PNG ou WEBP en un seul PDF."},
        {label:"Fusionner PDFs",  desc:"Combine plusieurs PDFs en respectant l'ordre."},
        {label:"Diviser PDF",     desc:"Extrait des pages ou plages de n'importe quel PDF."},
        {label:"Compresser PDF",  desc:"Réduit la taille sans perte visible de qualité."},
        {label:"PNG → JPG",       desc:"Convertit des images PNG en format JPG."},
        {label:"JPG → PNG",       desc:"Convertit des images JPG en format PNG."},
        {label:"Rotation PDF",    desc:"Fait pivoter les pages PDF de 90°, 180° ou 270°."},
        {label:"Excel → PDF",     desc:"Convertit des feuilles Excel en PDF."} ],
    con_intro:"Une question ou un problème ? Écrivez-nous et nous répondons en moins de 48h ouvrées.",
    con_name:"Nom", con_email:"E-mail", con_subject:"Sujet", con_msg:"Message",
    con_name_ph:"Votre nom", con_email_ph:"vous@email.com", con_msg_ph:"Décrivez en détail...",
    con_subjects:[["general","Demande générale"],["bug","Signaler un bug"],["feature","Suggestion"],["api","Accès API"],["legal","Question légale"]],
    con_send:"Envoyer", con_sending:"Envoi…", con_cancel:"Annuler",
    con_done_title:"Message reçu",
    con_done_sub:"Nous répondons dans les 48 heures ouvrées.",
    con_close:"Fermer", con_required:"Veuillez remplir tous les champs",
    con_sent:"Message envoyé",
    con_resp_t:"Délai de réponse", con_resp_v:"< 48h ouvrées",
    priv_chips:["Sans suivi","Traitement local","Sans stockage"],
    api_beta:"API en bêta privée. Demandez l'accès via le formulaire de contact.",
    api_copy:"Copier", api_copied:"✓ Copié",
    api_plans:[{t:"Free",r:"50 req/mois",s:"10 Mo",p:"Gratuit"},{t:"Pro",r:"5 000 req/mois",s:"100 Mo",p:"€19/mois"},{t:"Business",r:"Illimité",s:"500 Mo",p:"€99/mois"}],
  },
  de: {
    code:"de", flag:"🇩🇪", name:"Deutsch",
    tagline:"Ohne Anmeldung · Ohne Wasserzeichen · 100% privat",
    hero_h1a:"Der schnellste Weg,", hero_h1b:"deine Dateien zu konvertieren.",
    hero_sub:"PDF, Word, Excel, Bilder. Alles kostenlos, ohne Anmeldung, deine Dateien verlassen den Browser nicht.",
    hero_cta:"Jetzt starten — kostenlos",
    hero_drop:"Datei hier ablegen",
    hero_drop_sub:"Automatische Tool-Erkennung",
    tools_title:"Werkzeuge", tools_count:"verfügbar",
    detected:"Erkannt",
    unknown_fmt:"Format nicht erkannt",
    incompat:"Inkompatibles Format",
    drag_single:"Datei hier ablegen",
    drag_multi:"Dateien hier ablegen",
    click_hint:"oder klicken zum Auswählen",
    processing:"Verarbeitung…",
    convert:"Konvertieren", cancel:"Abbrechen",
    download:"Herunterladen", other:"Weitere Datei",
    done_title:"Bereit zum Herunterladen",
    done_sub_s:"Datei verarbeitet", done_sub_p:"Dateien verarbeitet",
    conv_done:"Konvertierung abgeschlossen",
    dl_started:"Download gestartet",
    pages_label:"Seitenbereich (z. B. 1-3, 5, 7-9)",
    pages_ph:"Leer = alle Seiten",
    compress_level:"Komprimierungsgrad",
    q_low:"Leicht", q_med:"Mittel", q_high:"Maximum",
    feat:[ ["Lokale Verarbeitung","Deine Dateien verlassen den Browser nicht."],
           ["Format erhalten","Schriften, Ränder und Tabellen intakt."],
           ["Sofort-Download","Ergebnis in Sekunden bereit."],
           ["Keine Limits","Dateien bis zu 200 MB."] ],
    max_size:"max. 200 MB",
    counter:"Dateien konvertiert",
    step_read:"Datei lesen…", step_proc:"Verarbeitung…", step_done:"Fertig!",
    hist_title:"Letzte Konvertierungen", hist_empty:"Du hast noch keine Dateien konvertiert.", hist_clear:"Verlauf löschen",
    nav_privacy:"Datenschutz", nav_api:"API", nav_help:"Hilfe",
    footer_copy:"morf · © 2025",
    modal_privacy:"Datenschutzerklärung", modal_terms:"Nutzungsbedingungen",
    modal_contact:"Kontakt", modal_api:"morf API",
    err_title:"Konvertierung fehlgeschlagen",
    err_retry:"Erneut versuchen",
    err_size:"Die Datei überschreitet das 200-MB-Limit. Bitte verwende eine kleinere Datei.",
    err_protected:"Dieses PDF ist passwortgeschützt. Entferne das Passwort vor der Konvertierung.",
    err_corrupt:"Die Datei scheint beschädigt oder kein gültiges Format zu sein.",
    err_range:"Ungültiger Seitenbereich. Verwende das Format 1-3, 5, 7-9.",
    err_popup:"Der Browser hat das Popup-Fenster blockiert. Erlaube Popups und versuche es erneut.",
    err_generic:"Ein unerwarteter Fehler ist aufgetreten. Prüfe, ob die Datei nicht beschädigt ist.",
    err_suggest:"Immer noch Probleme? Schreib uns an hola@morf.app",
    err_odt:"ODT-Format erkannt. Öffne es in LibreOffice und speichere es als .docx (Datei → Speichern unter → Word 2007-365) und versuche es erneut.",
    t:[ {label:"PDF → Word",       desc:"Konvertiert PDF in ein bearbeitbares Word-Dokument."},
        {label:"Word → PDF",       desc:"Wandelt Word in hochwertige PDFs um."},
        {label:"Bild → PDF",       desc:"Fasst JPG, PNG oder WEBP in eine PDF zusammen."},
        {label:"PDFs zusammenführen", desc:"Kombiniert mehrere PDFs in der richtigen Reihenfolge."},
        {label:"PDF teilen",       desc:"Extrahiert Seiten oder Bereiche aus beliebigen PDFs."},
        {label:"PDF komprimieren", desc:"Reduziert die Dateigröße ohne sichtbaren Qualitätsverlust."},
        {label:"PNG → JPG",        desc:"Konvertiert PNG-Bilder in das JPG-Format."},
        {label:"JPG → PNG",        desc:"Konvertiert JPG-Bilder in das PNG-Format."},
        {label:"PDF drehen",       desc:"Dreht PDF-Seiten um 90°, 180° oder 270°."},
        {label:"Excel → PDF",      desc:"Konvertiert Excel-Tabellen in PDF."} ],
    con_intro:"Fragen oder Probleme? Schreib uns und wir antworten innerhalb von 48 Stunden.",
    con_name:"Name", con_email:"E-Mail", con_subject:"Betreff", con_msg:"Nachricht",
    con_name_ph:"Dein Name", con_email_ph:"du@email.com", con_msg_ph:"Beschreibe es im Detail...",
    con_subjects:[["general","Allgemeine Anfrage"],["bug","Fehler melden"],["feature","Verbesserungsvorschlag"],["api","API-Zugang"],["legal","Rechtliche Frage"]],
    con_send:"Nachricht senden", con_sending:"Senden…", con_cancel:"Abbrechen",
    con_done_title:"Nachricht erhalten",
    con_done_sub:"Wir antworten innerhalb von 48 Werktagen.",
    con_close:"Schließen", con_required:"Bitte alle Felder ausfüllen",
    con_sent:"Nachricht gesendet",
    con_resp_t:"Antwortzeit", con_resp_v:"< 48 Werktage",
    priv_chips:["Kein Tracking","Lokale Verarbeitung","Keine Speicherung"],
    api_beta:"API in privater Beta. Zugang über das Kontaktformular anfordern.",
    api_copy:"Kopieren", api_copied:"✓ Kopiert",
    api_plans:[{t:"Free",r:"50 Req/Monat",s:"10 MB",p:"Kostenlos"},{t:"Pro",r:"5.000 Req/Monat",s:"100 MB",p:"€19/Monat"},{t:"Business",r:"Unbegrenzt",s:"500 MB",p:"€99/Monat"}],
  },
  pt: {
    code:"pt", flag:"🇵🇹", name:"Português",
    tagline:"Sem registo · Sem marcas de água · 100% privado",
    hero_h1a:"A forma mais rápida de", hero_h1b:"converter os teus ficheiros.",
    hero_sub:"PDF, Word, Excel, imagens. Tudo grátis, sem registo e os ficheiros ficam no teu browser.",
    hero_cta:"Começar agora — é grátis",
    hero_drop:"Arrasta qualquer ficheiro para aqui",
    hero_drop_sub:"Deteção automática da ferramenta",
    tools_title:"Ferramentas", tools_count:"disponíveis",
    detected:"Detetado",
    unknown_fmt:"Formato não reconhecido",
    incompat:"Formato incompatível",
    drag_single:"Arrasta o teu ficheiro para aqui",
    drag_multi:"Arrasta os teus ficheiros para aqui",
    click_hint:"ou clica para selecionar",
    processing:"A processar…",
    convert:"Converter", cancel:"Cancelar",
    download:"Descarregar", other:"Outro ficheiro",
    done_title:"Pronto para descarregar",
    done_sub_s:"ficheiro processado", done_sub_p:"ficheiros processados",
    conv_done:"Conversão concluída",
    dl_started:"Download iniciado",
    pages_label:"Intervalo de páginas (ex: 1-3, 5, 7-9)",
    pages_ph:"Vazio = todas as páginas",
    compress_level:"Nível de compressão",
    q_low:"Leve", q_med:"Média", q_high:"Máxima",
    feat:[ ["Processamento local","Os teus ficheiros não saem do browser."],
           ["Formato preservado","Fontes, margens e tabelas intactas."],
           ["Download imediato","Resultado pronto em segundos."],
           ["Sem limites","Ficheiros até 200 MB."] ],
    max_size:"máx. 200 MB",
    counter:"ficheiros convertidos",
    step_read:"A ler ficheiro…", step_proc:"A processar…", step_done:"Pronto!",
    hist_title:"Conversões recentes", hist_empty:"Ainda não converteste nenhum ficheiro.", hist_clear:"Limpar histórico",
    nav_privacy:"Privacidade", nav_api:"API", nav_help:"Ajuda",
    footer_copy:"morf · © 2025",
    modal_privacy:"Política de Privacidade", modal_terms:"Termos de Utilização",
    modal_contact:"Contacto", modal_api:"API morf",
    err_title:"Não foi possível completar a conversão",
    err_retry:"Tentar novamente",
    err_size:"O ficheiro excede o limite de 200 MB. Usa um ficheiro mais pequeno.",
    err_protected:"Este PDF está protegido por palavra-passe. Remove-a antes de converter.",
    err_corrupt:"O ficheiro parece estar corrompido ou não é um formato válido.",
    err_range:"Intervalo de páginas inválido. Usa o formato 1-3, 5, 7-9.",
    err_popup:"O browser bloqueou a janela pop-up. Permite pop-ups e tenta novamente.",
    err_generic:"Ocorreu um erro inesperado. Verifica se o ficheiro não está corrompido.",
    err_suggest:"Continua a falhar? Escreve-nos para hola@morf.app",
    err_odt:"Formato ODT detetado. Abre-o no LibreOffice e guarda como .docx (Ficheiro → Guardar como → Word 2007-365) e tenta novamente.",
    t:[ {label:"PDF → Word",       desc:"Converte PDF em documento Word editável."},
        {label:"Word → PDF",       desc:"Transforma Word em PDF de alta fidelidade."},
        {label:"Imagem → PDF",     desc:"Agrupa JPG, PNG ou WEBP num único PDF."},
        {label:"Unir PDFs",        desc:"Combina vários PDFs respeitando a ordem."},
        {label:"Dividir PDF",      desc:"Extrai páginas ou intervalos de qualquer PDF."},
        {label:"Comprimir PDF",    desc:"Reduz o tamanho sem perda visível de qualidade."},
        {label:"PNG → JPG",        desc:"Converte imagens PNG para formato JPG."},
        {label:"JPG → PNG",        desc:"Converte imagens JPG para formato PNG."},
        {label:"Rodar PDF",        desc:"Roda páginas do PDF 90°, 180° ou 270°."},
        {label:"Excel → PDF",      desc:"Converte folhas de cálculo Excel em PDF."} ],
    con_intro:"Tens alguma dúvida? Escreve-nos e respondemos em menos de 48h úteis.",
    con_name:"Nome", con_email:"E-mail", con_subject:"Assunto", con_msg:"Mensagem",
    con_name_ph:"O teu nome", con_email_ph:"tu@email.com", con_msg_ph:"Descreve em detalhe...",
    con_subjects:[["general","Consulta geral"],["bug","Reportar erro"],["feature","Sugestão"],["api","Acesso à API"],["legal","Assunto legal"]],
    con_send:"Enviar mensagem", con_sending:"A enviar…", con_cancel:"Cancelar",
    con_done_title:"Mensagem recebida",
    con_done_sub:"Respondemos em menos de 48 horas úteis.",
    con_close:"Fechar", con_required:"Preenche todos os campos",
    con_sent:"Mensagem enviada",
    con_resp_t:"Resposta", con_resp_v:"< 48h úteis",
    priv_chips:["Sem rastreio","Processamento local","Sem armazenamento"],
    api_beta:"API em beta privada. Solicita acesso no formulário de contacto.",
    api_copy:"Copiar", api_copied:"✓ Copiado",
    api_plans:[{t:"Free",r:"50 req/mês",s:"10 MB",p:"Grátis"},{t:"Pro",r:"5.000 req/mês",s:"100 MB",p:"€19/mês"},{t:"Business",r:"Ilimitado",s:"500 MB",p:"€99/mês"}],
  },
};

function detectLang() {
  const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase().slice(0,2);
  return LANGS[nav] ? nav : "en";
}

const LangCtx = createContext(null);
const useLang = () => useContext(LangCtx);

/* ── CSS ──────────────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  html,body,#root{margin:0;padding:0;min-height:100vh;background:inherit}
  .m*{box-sizing:border-box;margin:0;padding:0}
  .m{
    --bg:#F9F9F8;--sf:#FFF;--bd:#E3E3E0;--bh:#C4C4C0;
    --t1:#111110;--t2:#6B6B68;--tm:#9B9B98;
    --ac:#1C3042;--al:#E8EDF2;--ah:#142435;--ok:#1B6640;
    font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);
    font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh;
    transition:background .2s,color .2s;
  }
  .m.dark{
    --bg:#0F1117;--sf:#1A1D27;--bd:#2A2D3A;--bh:#3A3D4A;
    --t1:#F0F0EE;--t2:#9A9AA8;--tm:#6A6A78;
    --ac:#7BA7C4;--al:#1A2535;--ah:#8FB8D5;--ok:#4ADE80;
  }
  .m.dark .fr{background:#1E2130}
  .m.dark .bg:hover{background:#2A2D3A}
  .m.dark .lang-btn:hover{background:#2A2D3A}
  .m.dark .lang-opt:hover{background:#2A2D3A}
  .m.dark .tpdf{background:#3B1515;color:#F87171}
  .m.dark .tdocx{background:#1A2540;color:#93C5FD}
  .m.dark .timg{background:#142515;color:#4ADE80}
  @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes pr{from{width:0}to{width:100%}}
  @keyframes fo{from{opacity:0}to{opacity:1}}
  @keyframes mu{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes ld{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}

  .fu{animation:fu .32s ease both}
  .fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
  .fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}

  .card{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:18px;cursor:pointer;
    transition:border-color .16s,box-shadow .16s,transform .16s}
  .card:hover{border-color:var(--bh);box-shadow:0 2px 10px rgba(0,0,0,.07);transform:translateY(-1px)}
  .card.on{border-color:var(--ac);box-shadow:0 0 0 3px var(--al)}

  .bp{background:var(--ac);color:#fff;border:none;border-radius:6px;padding:9px 18px;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;
    display:inline-flex;align-items:center;gap:7px;transition:background .16s,transform .16s}
  .bp:hover{background:var(--ah)}.bp:disabled{opacity:.4;cursor:not-allowed}

  .bg{background:transparent;color:var(--t2);border:1px solid var(--bd);border-radius:6px;
    padding:8px 16px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .16s}
  .bg:hover{border-color:var(--bh);color:var(--t1);background:#F5F5F3}

  .dz{border:1.5px dashed var(--bd);border-radius:10px;background:var(--sf);transition:all .16s;cursor:pointer}
  .dz:hover,.dz.ov{border-color:var(--ac);background:var(--al)}

  .tr{height:3px;background:var(--bd);border-radius:2px;overflow:hidden}
  .fill{height:100%;background:var(--ac);border-radius:2px;animation:pr 2.4s cubic-bezier(.4,0,.2,1) forwards}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .step-dot{width:8px;height:8px;border-radius:50%;background:var(--bd);transition:all .3s}
  .step-dot.active{background:var(--ac);animation:pulse 1.2s ease infinite}
  .step-dot.done{background:var(--ok)}
  .spn{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}

  .fr{display:flex;align-items:center;gap:9px;padding:9px 12px;background:#F5F5F3;
    border-radius:6px;border:1px solid var(--bd);animation:fu .2s ease both}

  .toast{position:fixed;bottom:20px;right:20px;background:var(--t1);color:#fff;
    padding:10px 16px;border-radius:6px;font-size:12px;display:flex;align-items:center;gap:8px;
    box-shadow:0 8px 24px rgba(0,0,0,.18);animation:fu .25s ease both;z-index:9999;
    font-family:'DM Sans',sans-serif}

  .tag{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;
    font-size:10px;font-weight:500;letter-spacing:.03em;font-family:'DM Mono',monospace}
  .tpdf{background:#FEF2F2;color:#B91C1C}
  .tdocx{background:#EFF6FF;color:#1D4ED8}
  .timg{background:#F0FDF4;color:#15803D}

  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  @media(max-width:560px){.grid{grid-template-columns:repeat(2,1fr)!important}}
  @media(max-width:360px){.grid{grid-template-columns:1fr!important}}

  /* ── Mobile improvements ── */
  @media(max-width:600px){
    /* Header */
    .m-header-inner{padding:0 14px!important}
    .m-logo-text{display:none}
    .m-nav-labels{display:none}

    /* Hero */
    .m-hero{padding:32px 14px 48px!important}
    .m-hero-drop{padding:28px 14px!important;margin-bottom:32px!important}

    /* Panel */
    .m-panel{margin:0 -14px!important;border-radius:0!important;border-left:none!important;border-right:none!important}

    /* Features */
    .m-feat{grid-template-columns:1fr 1fr!important}

    /* Buttons */
    .bp,.bg{font-size:12px!important;padding:8px 14px!important}

    /* Modal */
    .sh{max-height:92vh!important}
    .sh-body{padding:16px!important}

    /* Toast */
    .toast{left:14px!important;right:14px!important;bottom:14px!important;font-size:11px!important}

    /* Steps UI */
    .m-steps{padding:12px!important}
  }

  @media(max-width:400px){
    .grid{grid-template-columns:1fr 1fr!important}
    .m-nav-privacy{display:none}
  }

  /* lang picker */
  .lang-wrap{position:relative}
  .lang-btn{display:flex;align-items:center;gap:6px;background:transparent;border:1px solid var(--bd);
    border-radius:6px;padding:5px 10px;font-family:'DM Sans',sans-serif;font-size:12px;
    color:var(--t2);cursor:pointer;transition:all .16s}
  .lang-btn:hover{border-color:var(--bh);color:var(--t1);background:#F5F5F3}
  .lang-drop{position:absolute;top:calc(100% + 6px);right:0;background:var(--sf);
    border:1px solid var(--bd);border-radius:8px;overflow:hidden;z-index:300;min-width:140px;
    box-shadow:0 4px 16px rgba(0,0,0,.1);animation:ld .16s ease both}
  .lang-opt{display:flex;align-items:center;gap:8px;padding:9px 13px;font-size:13px;
    color:var(--t2);cursor:pointer;transition:background .12s;border:none;
    background:transparent;width:100%;font-family:'DM Sans',sans-serif;text-align:left}
  .lang-opt:hover{background:#F5F5F3;color:var(--t1)}
  .lang-opt.sel{color:var(--ac);font-weight:500}

  /* modal */
  .ov{position:fixed;inset:0;background:rgba(17,17,16,.55);backdrop-filter:blur(4px);
    z-index:200;display:flex;align-items:flex-end;justify-content:center;animation:fo .2s ease both}
  .sh{background:var(--sf);width:100%;max-width:700px;max-height:88vh;
    border-radius:14px 14px 0 0;overflow:hidden;display:flex;flex-direction:column;
    animation:mu .28s cubic-bezier(.25,.46,.45,.94) both}
  @media(min-width:720px){.ov{align-items:center;padding:20px}.sh{border-radius:14px;max-height:84vh}}
  .sh-head{padding:18px 22px 14px;border-bottom:1px solid var(--bd);
    display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .sh-body{overflow-y:auto;padding:22px;flex:1}
  .sh-body::-webkit-scrollbar{width:5px}
  .sh-body::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}

  /* legal */
  .lg h2{font-size:13px;font-weight:600;color:var(--t1);margin:22px 0 7px;letter-spacing:-.01em}
  .lg h2:first-child{margin-top:0}
  .lg p{font-size:13px;color:var(--t2);line-height:1.75;margin-bottom:10px}
  .lg ul{padding-left:18px;margin-bottom:10px}
  .lg li{font-size:13px;color:var(--t2);line-height:1.75;margin-bottom:4px}
  .lg strong{color:var(--t1);font-weight:500}
  .divv{height:1px;background:var(--bd);margin:18px 0}
  .chip{display:inline-flex;align-items:center;gap:5px;background:var(--al);color:var(--ac);
    border-radius:5px;padding:3px 9px;font-size:11px;font-weight:500;margin:0 4px 4px 0}

  /* code */
  .cb{background:#111110;color:#E5E5E5;border-radius:8px;padding:15px;
    font-family:'DM Mono',monospace;font-size:11px;line-height:1.75;
    overflow-x:auto;margin:8px 0 14px;position:relative}
  .kw{color:#7DD3FC}.st{color:#86EFAC}.cm{color:#6B7280}.fn{color:#FCA5A5}
  .cpbtn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.1);
    border:none;border-radius:4px;padding:3px 9px;cursor:pointer;
    font-size:10px;color:#9CA3AF;font-family:'DM Sans',sans-serif;transition:all .16s}
  .cpbtn:hover{background:rgba(255,255,255,.2);color:#fff}

  /* form */
  .fi-label{font-size:11px;font-weight:500;color:var(--t2);display:block;margin-bottom:5px}
  .fi-inp{width:100%;padding:9px 12px;border:1px solid var(--bd);border-radius:6px;
    font-family:'DM Sans',sans-serif;font-size:13px;color:var(--t1);
    background:var(--sf);outline:none;transition:border-color .16s}
  .fi-inp:focus{border-color:var(--ac)}
  .fi-ta{resize:vertical;min-height:96px}

  .nl{color:var(--tm);text-decoration:none;font-size:12px;background:none;border:none;
    cursor:pointer;font-family:'DM Sans',sans-serif;transition:color .16s;padding:0}
  .nl:hover{color:var(--t1)}
  .fl{color:var(--tm);text-decoration:none;font-size:11px;background:none;border:none;
    cursor:pointer;font-family:'DM Sans',sans-serif;transition:color .16s;padding:0}
  .fl:hover{color:var(--t1)}
`;

/* ── Icons ────────────────────────────────────────────────────────────────── */
const ic = {
  upload:   <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
  file:     <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></>,
  word:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 15 10 9 12 14 14 9 16 15"/></>,
  pdf:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></>,
  img:      <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
  merge:    <><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="4" y1="9" x2="4" y2="15"/><polyline points="2 12 4 15 6 12"/><line x1="20" y1="9" x2="20" y2="15"/><polyline points="18 12 20 9 22 12"/></>,
  split:    <><line x1="12" y1="2" x2="12" y2="22"/><polyline points="5 9 12 2 19 9"/><polyline points="5 15 12 22 19 15"/></>,
  compress: <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="20" x2="21" y2="9"/><line x1="3" y1="11" x2="14" y2="0"/></>,
  arrow:    <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  check:    <polyline points="20 6 9 17 4 12"/>,
  x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  logo:     <><rect x="2" y="2" width="9" height="9" rx="2"/><rect x="13" y="2" width="9" height="9" rx="2"/><rect x="2" y="13" width="9" height="9" rx="2"/><path d="M13 18h9"/><path d="M18 13v9"/></>,
  lock:     <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  code:     <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  mail:     <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  zap:      <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  shield:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  globe:    <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  chevron:  <polyline points="6 9 12 15 18 9"/>,
  rotate:   <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
  excel:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 10.5 17 13 13"/><line x1="8" y1="17" x2="13" y2="13"/></>,
  sun:      <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
  moon:     <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
};
const Ic = ({ n, s=17, c="currentColor", sw=1.5 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {ic[n]||ic.file}
  </svg>
);
const Tag = ({ type }) => {
  const m = { pdf:["tpdf","PDF"], docx:["tdocx","DOCX"], img:["timg","IMG"] };
  const [cls,lbl] = m[type]||["tpdf","PDF"];
  return <span className={`tag ${cls}`}>{lbl}</span>;
};

/* ── Language Picker ─────────────────────────────────────────────────────── */
function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = LANGS[lang];
  return (
    <div className="lang-wrap" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen(o => !o)}>
        <span style={{fontSize:15}}>{cur.flag}</span>
        <span>{cur.code.toUpperCase()}</span>
        <Ic n="chevron" s={12} c="var(--tm)"/>
      </button>
      {open && (
        <div className="lang-drop">
          {Object.values(LANGS).map(l => (
            <button key={l.code} className={`lang-opt ${lang===l.code?"sel":""}`}
              onClick={() => { setLang(l.code); setOpen(false); }}>
              <span style={{fontSize:15}}>{l.flag}</span>
              <span>{l.name}</span>
              {lang===l.code && <Ic n="check" s={12} c="var(--ac)" style={{marginLeft:"auto"}}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
function Modal({ title, icon, onClose, children }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div className="ov" onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="sh">
        <div className="sh-head">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:7,background:"var(--al)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n={icon} s={15} c="var(--ac)"/>
            </div>
            <span style={{fontWeight:600,fontSize:14}}>{title}</span>
          </div>
          <button className="bg" style={{padding:"5px 9px"}} onClick={onClose}><Ic n="x" s={14}/></button>
        </div>
        <div className="sh-body lg">{children}</div>
      </div>
    </div>
  );
}

/* ── Privacy ─────────────────────────────────────────────────────────────── */
function Privacy() {
  const T = useLang();
  return <>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:20}}>
      {[["shield",T.priv_chips[0]],["lock",T.priv_chips[1]],["check",T.priv_chips[2]]].map(([i,l])=>(
        <span key={l} className="chip"><Ic n={i} s={11} c="var(--ac)"/>{l}</span>
      ))}
    </div>
    <h2>{T.code==="es"?"Qué datos procesamos":T.code==="en"?"What data we process":T.code==="fr"?"Données traitées":T.code==="de"?"Welche Daten wir verarbeiten":"Que dados processamos"}</h2>
    <p>{T.code==="es"?"morf procesa tus archivos directamente en tu navegador mediante WebAssembly. Ningún archivo es enviado a servidores externos — todo ocurre localmente en tu dispositivo.":T.code==="en"?"morf processes your files directly in your browser using WebAssembly. No file is ever sent to external servers — everything happens locally on your device.":T.code==="fr"?"morf traite vos fichiers directement dans votre navigateur via WebAssembly. Aucun fichier n'est envoyé à des serveurs externes — tout se passe localement sur votre appareil.":T.code==="de"?"morf verarbeitet deine Dateien direkt im Browser per WebAssembly. Keine Datei wird an externe Server gesendet — alles geschieht lokal auf deinem Gerät.":"morf processa os teus ficheiros diretamente no browser via WebAssembly. Nenhum ficheiro é enviado para servidores externos — tudo acontece localmente no teu dispositivo."}</p>
    <h2>{T.code==="es"?"Qué no recopilamos":T.code==="en"?"What we don't collect":T.code==="fr"?"Ce que nous ne collectons pas":T.code==="de"?"Was wir nicht erfassen":"O que não recolhemos"}</h2>
    <ul>
      {(T.code==="es"?["No guardamos ni transmitimos el contenido de tus archivos.","No creamos cuentas ni perfiles de usuario.","No usamos cookies de seguimiento ni píxeles de rastreo.","No compartimos datos con terceros con fines publicitarios."]:T.code==="en"?["We do not save or transmit the content of your files.","We do not create user accounts or profiles.","We do not use tracking cookies or tracking pixels.","We do not share data with third parties for advertising purposes."]:T.code==="fr"?["Nous ne sauvegardons pas le contenu de vos fichiers.","Nous ne créons pas de comptes ni de profils utilisateur.","Nous n'utilisons pas de cookies de suivi.","Nous ne partageons pas de données avec des tiers à des fins publicitaires."]:T.code==="de"?["Wir speichern oder übertragen keine Dateiinhalte.","Wir erstellen keine Benutzerkonten oder Profile.","Wir verwenden keine Tracking-Cookies oder Tracking-Pixel.","Wir teilen keine Daten mit Dritten für Werbezwecke."]:["Não guardamos nem transmitimos o conteúdo dos teus ficheiros.","Não criamos contas nem perfis de utilizador.","Não usamos cookies de rastreio.","Não partilhamos dados com terceiros para fins publicitários."]).map((item,i)=>(
        <li key={i}>{item}</li>
      ))}
    </ul>
    <div className="divv"/>
    <h2>{T.code==="es"?"Retención de archivos":T.code==="en"?"File retention":T.code==="fr"?"Conservation des fichiers":T.code==="de"?"Dateispeicherung":"Retenção de ficheiros"}</h2>
    <p>{T.code==="es"?"Los archivos procesados existen únicamente en memoria temporal durante la sesión activa. Al cerrar la pestaña o el navegador, todos los datos son eliminados automáticamente.":T.code==="en"?"Processed files exist only in temporary browser memory during the active session. When you close the tab or browser, all processing data is automatically deleted.":T.code==="fr"?"Les fichiers traités n'existent que dans la mémoire temporaire du navigateur. Lorsque vous fermez l'onglet, toutes les données sont automatiquement supprimées.":T.code==="de"?"Verarbeitete Dateien existieren nur im temporären Browserspeicher während der aktiven Sitzung. Beim Schließen des Tabs werden alle Daten automatisch gelöscht.":"Os ficheiros processados existem apenas na memória temporária do browser durante a sessão. Ao fechar o separador, todos os dados são eliminados automaticamente."}</p>
    <div className="divv"/>
    <p style={{fontSize:11,color:"var(--tm)"}}>{T.code==="es"?"Última actualización: enero 2025 · morf v0.1 Beta":T.code==="en"?"Last updated: January 2025 · morf v0.1 Beta":T.code==="fr"?"Dernière mise à jour : janvier 2025 · morf v0.1 Beta":T.code==="de"?"Letzte Aktualisierung: Januar 2025 · morf v0.1 Beta":"Última atualização: janeiro de 2025 · morf v0.1 Beta"}</p>
  </>;
}

/* ── Terms ───────────────────────────────────────────────────────────────── */
function Terms() {
  const T = useLang();
  const isEs = T.code==="es", isEn = T.code==="en", isFr = T.code==="fr", isDe = T.code==="de";
  return <>
    <p>{isEs?"Al usar morf aceptas estos términos.":isEn?"By using morf you accept these terms.":isFr?"En utilisant morf, vous acceptez ces conditions.":isDe?"Durch die Nutzung von morf akzeptierst du diese Bedingungen.":"Ao usar o morf aceitas estes termos."}</p>
    <h2>{isEs?"1. Uso del servicio":isEn?"1. Use of the service":isFr?"1. Utilisation du service":isDe?"1. Nutzung des Dienstes":"1. Utilização do serviço"}</h2>
    <p>{isEs?"morf es una herramienta de conversión de archivos de uso personal y profesional. Puedes usarla para convertir archivos propios o sobre los que tengas los derechos necesarios.":isEn?"morf is a file conversion tool for personal and professional use. You may use it to convert files you own or have the necessary rights to.":isFr?"morf est un outil de conversion de fichiers à usage personnel et professionnel. Vous pouvez l'utiliser pour convertir des fichiers qui vous appartiennent.":isDe?"morf ist ein Dateikonvertierungstool für den persönlichen und beruflichen Einsatz. Du darfst es für Dateien nutzen, die dir gehören oder für die du die nötigen Rechte hast.":"morf é uma ferramenta de conversão de ficheiros para uso pessoal e profissional."}</p>
    <h2>{isEs?"2. Propiedad intelectual":isEn?"2. Intellectual property":isFr?"2. Propriété intellectuelle":isDe?"2. Geistiges Eigentum":"2. Propriedade intelectual"}</h2>
    <p>{isEs?"El software, diseño y marca de morf son propiedad exclusiva de sus creadores. Tus archivos siguen siendo de tu entera propiedad — morf no reclama ningún derecho sobre el contenido que procesas.":isEn?"The software, design and brand of morf are the exclusive property of its creators. Your files remain entirely your property — morf claims no rights over the content you process.":isFr?"Le logiciel, le design et la marque morf sont la propriété exclusive de ses créateurs. Vos fichiers restent entièrement votre propriété.":isDe?"Software, Design und Marke von morf sind ausschließliches Eigentum der Entwickler. Deine Dateien bleiben vollständig dein Eigentum.":"O software, design e marca do morf são propriedade exclusiva dos seus criadores. Os teus ficheiros continuam a ser tua propriedade."}</p>
    <h2>{isEs?"3. Limitación de responsabilidad":isEn?"3. Limitation of liability":isFr?"3. Limitation de responsabilité":isDe?"3. Haftungsbeschränkung":"3. Limitação de responsabilidade"}</h2>
    <p>{isEs?"morf no se hace responsable de pérdida de datos o incompatibilidades de formato. Recomendamos mantener siempre una copia de seguridad de los archivos originales.":isEn?"morf is not responsible for data loss or format incompatibilities. We recommend always keeping a backup of your original files.":isFr?"morf n'est pas responsable de la perte de données ou des incompatibilités de format. Conservez toujours une copie de sauvegarde de vos fichiers originaux.":isDe?"morf haftet nicht für Datenverlust oder Formatinkompatibilitäten. Behalte immer eine Sicherungskopie deiner Originaldateien.":"morf não se responsabiliza por perda de dados ou incompatibilidades de formato. Recomendamos manter sempre uma cópia de segurança dos ficheiros originais."}</p>
    <div className="divv"/>
    <p style={{fontSize:11,color:"var(--tm)"}}>{isEs?"Última actualización: enero 2025":isEn?"Last updated: January 2025":isFr?"Dernière mise à jour : janvier 2025":isDe?"Letzte Aktualisierung: Januar 2025":"Última atualização: janeiro de 2025"}</p>
  </>;
}

/* ── Contact ─────────────────────────────────────────────────────────────── */
function Contact({ showToast, onClose }) {
  const T = useLang();
  const [form, setForm] = useState({ name:"", email:"", subject:"general", msg:"" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const send = () => {
    if (!form.name||!form.email||!form.msg){ showToast(T.con_required,"err"); return; }
    setSending(true);
    setTimeout(()=>{ setSending(false); setSent(true); showToast(T.con_sent); }, 1800);
  };

  if (sent) return (
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{width:52,height:52,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
        <Ic n="check" s={22} c="var(--ok)"/>
      </div>
      <div style={{fontWeight:500,marginBottom:6}}>{T.con_done_title}</div>
      <p style={{color:"var(--t2)",fontSize:13,maxWidth:300,margin:"0 auto 22px",lineHeight:1.6}}>{T.con_done_sub}</p>
      <button className="bg" onClick={onClose}>{T.con_close}</button>
    </div>
  );

  return <>
    <p style={{marginBottom:18}}>{T.con_intro}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <div><label className="fi-label">{T.con_name}</label><input className="fi-inp" placeholder={T.con_name_ph} value={form.name} onChange={set("name")}/></div>
      <div><label className="fi-label">{T.con_email}</label><input className="fi-inp" type="email" placeholder={T.con_email_ph} value={form.email} onChange={set("email")}/></div>
    </div>
    <div style={{marginBottom:12}}>
      <label className="fi-label">{T.con_subject}</label>
      <select className="fi-inp" value={form.subject} onChange={set("subject")}>
        {T.con_subjects.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
    <div style={{marginBottom:16}}>
      <label className="fi-label">{T.con_msg}</label>
      <textarea className="fi-inp fi-ta" placeholder={T.con_msg_ph} value={form.msg} onChange={set("msg")}/>
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:20}}>
      <button className="bg" onClick={onClose}>{T.con_cancel}</button>
      <button className="bp" onClick={send} disabled={sending}>
        {sending?<><div className="spn"/>{T.con_sending}</>:<><Ic n="mail" s={14}/>{T.con_send}</>}
      </button>
    </div>
    <div className="divv"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{i:"mail",t:"Email",v:"hola@morf.app"},{i:"zap",t:T.con_resp_t,v:T.con_resp_v}].map(r=>(
        <div key={r.t} style={{display:"flex",gap:10,padding:"12px 14px",background:"#F9F9F8",borderRadius:8,border:"1px solid var(--bd)"}}>
          <Ic n={r.i} s={14} c="var(--ac)"/>
          <div><div style={{fontSize:11,fontWeight:500,marginBottom:1}}>{r.t}</div><div style={{fontSize:11,color:"var(--tm)"}}>{r.v}</div></div>
        </div>
      ))}
    </div>
  </>;
}

/* ── API ─────────────────────────────────────────────────────────────────── */
function API() {
  const T = useLang();
  const [cop, setCop] = useState(null);
  const copy = (id, txt) => {
    try { navigator.clipboard.writeText(txt); } catch(e){}
    setCop(id); setTimeout(()=>setCop(null), 1600);
  };
  const CB = ({ id, txt, children }) => (
    <div className="cb">
      {children}
      <button className="cpbtn" onClick={()=>copy(id,txt)}>{cop===id?T.api_copied:T.api_copy}</button>
    </div>
  );
  return <>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--al)",borderRadius:8,marginBottom:20,border:"1px solid #CBD5E1"}}>
      <Ic n="zap" s={13} c="var(--ac)"/>
      <span style={{fontSize:12,color:"var(--ac)"}}>{T.api_beta}</span>
    </div>
    <h2>Endpoint</h2>
    <CB id="req" txt="POST https://api.morf.app/v1/convert">
      <span className="fn">POST</span> https://api.morf.app/<span className="kw">v1</span>/convert{"\n\n"}
      <span className="cm">// multipart/form-data</span>{"\n"}
      file:          <span className="st">document.pdf</span>{"\n"}
      output_format: <span className="st">"docx"</span>{"\n"}
      quality:       <span className="st">"high"</span>   <span className="cm">// low | medium | high</span>
    </CB>
    <h2>JavaScript</h2>
    <CB id="js" txt={`const form = new FormData();\nform.append('file', fileInput.files[0]);\nform.append('output_format', 'docx');\n\nconst res = await fetch('https://api.morf.app/v1/convert', {\n  method: 'POST',\n  headers: { 'Authorization': 'Bearer mk_live_xxx' },\n  body: form\n});\nconst blob = await res.blob();`}>
      <span className="kw">const</span> form = <span className="kw">new</span> <span className="fn">FormData</span>();{"\n"}
      form.<span className="fn">append</span>(<span className="st">'file'</span>, fileInput.files[<span className="kw">0</span>]);{"\n"}
      form.<span className="fn">append</span>(<span className="st">'output_format'</span>, <span className="st">'docx'</span>);{"\n\n"}
      <span className="kw">const</span> res = <span className="kw">await</span> <span className="fn">fetch</span>(<span className="st">'https://api.morf.app/v1/convert'</span>, {"{\n"}
      {"  method: "}<span className="st">'POST'</span>,{"\n"}
      {"  headers: { "}<span className="st">'Authorization'</span>: <span className="st">'Bearer mk_live_xxx'</span> {" },\n"}
      {"  body: form\n})"};{"\n"}
      <span className="kw">const</span> blob = <span className="kw">await</span> res.<span className="fn">blob</span>();
    </CB>
    <h2>{T.code==="es"?"Planes":T.code==="en"?"Plans":T.code==="fr"?"Forfaits":T.code==="de"?"Pläne":"Planos"}</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {T.api_plans.map(p=>(
        <div key={p.t} style={{padding:"14px",border:"1px solid var(--bd)",borderRadius:8,textAlign:"center"}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{p.t}</div>
          <div style={{fontSize:11,color:"var(--tm)",marginBottom:2}}>{p.r}</div>
          <div style={{fontSize:11,color:"var(--tm)",marginBottom:10}}>Max {p.s}</div>
          <div style={{fontWeight:500,fontSize:13,color:"var(--ac)"}}>{p.p}</div>
        </div>
      ))}
    </div>
  </>;
}

/* ── Tools ───────────────────────────────────────────────────────────────── */
const TOOL_BASE = [
  {id:"pdf-word",  icon:"word",     accepts:[".pdf"],                        from:"pdf",  to:"docx"},
  {id:"word-pdf",  icon:"pdf",      accepts:[".doc",".docx"], mimeTypes:["application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"], from:"docx", to:"pdf"},
  {id:"img-pdf",   icon:"img",      accepts:[".jpg",".jpeg",".png",".webp"], from:"img",  to:"pdf", multi:true},
  {id:"merge",     icon:"merge",    accepts:[".pdf"],                        from:"pdf",  to:"pdf", multi:true},
  {id:"split",     icon:"split",    accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"compress",  icon:"compress", accepts:[".pdf"],                        from:"pdf",  to:"pdf"},
  {id:"png-jpg",   icon:"img",      accepts:[".png"],                            from:"png",  to:"jpg"},
  {id:"jpg-png",   icon:"img",      accepts:[".jpg",".jpeg"],                    from:"jpg",  to:"png"},
  {id:"rotate",    icon:"rotate",   accepts:[".pdf"],                            from:"pdf",  to:"pdf"},
  {id:"excel-pdf", icon:"excel",    accepts:[".xlsx",".xls"], mimeTypes:["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"], from:"xlsx", to:"pdf"},
];

function FileRow({ file, onRemove }) {
  const ext = file.name.split(".").pop().toUpperCase();
  const kb  = (file.size/1024).toFixed(0);
  const sz  = kb<1024?`${kb} KB`:`${(kb/1024).toFixed(1)} MB`;
  return (
    <div className="fr">
      <Ic n="file" s={14} c="var(--tm)"/>
      <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</span>
      <span style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace",flexShrink:0}}>{sz}</span>
      <span style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace",background:"var(--bd)",padding:"1px 5px",borderRadius:3,flexShrink:0}}>{ext}</span>
      <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:"var(--tm)",display:"flex",alignItems:"center"}}>
        <Ic n="x" s={13}/>
      </button>
    </div>
  );
}

function Panel({ tool, onClose, showToast, bumpCount=()=>{}, addToHistory=()=>{} }) {
  const T = useLang();
  const [files,setFiles]     = useState([]);
  const [drag,setDrag]       = useState(false);
  const [status,setStatus]   = useState("idle"); // idle | proc | done | error
  const [range,setRange]     = useState("");
  const [quality,setQuality] = useState("medium");
  const [rotation,setRotation] = useState(90);
  const [errMsg,setErrMsg]   = useState("");
  const [step,setStep]       = useState(0); // 0=idle 1=read 2=proc 3=done
  const ref = useRef();

  const addFiles = l => {
    const list = Array.from(l);
    const hasOdt = list.some(f =>
      f.name.toLowerCase().endsWith(".odt") ||
      f.type === "application/vnd.oasis.opendocument.text"
    );
    if (hasOdt) { showToast(T.err_odt,"err"); return; }
    const ok = list.filter(f => {
      const name = f.name.toLowerCase();
      const mime = f.type.toLowerCase();
      const extOk  = (tool.accepts||[]).some(e => name.endsWith(e.replace(".","").toLowerCase()));
      const mimeOk = (tool.mimeTypes||[]).some(m => mime === m);
      return extOk || mimeOk;
    });
    if (!ok.length){ showToast(T.incompat,"err"); return; }
    setFiles(p=>tool.multi?[...p,...ok]:[ok[0]]);
  };

  const getErrMsg = (e) => {
    const msg = (e.message || "").toLowerCase();
    if (files[0] && files[0].size > 200 * 1024 * 1024) return T.err_size;
    if (msg.includes("encrypt") || msg.includes("password") || msg.includes("protected")) return T.err_protected;
    if (msg.includes("range") || msg.includes("rango")) return T.err_range;
    if (msg.includes("invalid") || msg.includes("corrupt") || msg.includes("unexpected")) return T.err_corrupt;
    return T.err_generic;
  };

  const convert = async () => {
    // Validar tamaño antes de procesar
    const maxSize = 200 * 1024 * 1024;
    if (files.some(f => f.size > maxSize)) {
      setErrMsg(T.err_size);
      setStatus("error");
      return;
    }
    setStatus("proc");
    setStep(1); // leyendo
    setErrMsg("");
    await new Promise(r => setTimeout(r, 350)); // pequeña pausa para que se vea el paso 1
    setStep(2); // procesando
    try {
      if (tool.id==="merge")         { await mergePdfs(files); }
      else if (tool.id==="split")    { await splitPdf(files[0], range); }
      else if (tool.id==="img-pdf")  { await imagesToPdf(files); }
      else if (tool.id==="compress") { await compressPdf(files[0], quality); }
      else if (tool.id==="word-pdf") {
        const f = files[0];
        const res = await wordToPdf(f);
        if (res === "popup-blocked") {
          setErrMsg(T.err_popup);
          setStatus("error");
          return;
        }
        showToast(T.conv_done);
        bumpCount();
        addToHistory(files[0]?.name, tool.label);
        setStatus("idle"); setFiles([]); return;
      }
      else if (tool.id==="pdf-word")  { await pdfToWord(files[0]); }
      else if (tool.id==="png-jpg")   { await pngToJpg(files[0]); }
      else if (tool.id==="jpg-png")   { await jpgToPng(files[0]); }
      else if (tool.id==="rotate")    { await rotatePdf(files[0], rotation); }
      else if (tool.id==="excel-pdf") {
        const res = await excelToPdf(files[0]);
        if (res === "popup-blocked") { setErrMsg(T.err_popup); setStatus("error"); return; }
        showToast(T.conv_done); bumpCount(); setStatus("idle"); setFiles([]); return;
      }
      setStep(3);
      setStatus("done");
      showToast(T.conv_done);
      bumpCount();
      addToHistory(files[0]?.name, tool.label);
    } catch(e) {
      console.error(e);
      setStep(0);
      setErrMsg(getErrMsg(e));
      setStatus("error");
    }
  };

  const dl = () => { setStatus("idle"); setFiles([]); };

  return (
    <div style={{background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:10,overflow:"hidden",animation:"fu .3s ease both"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:7,background:"var(--al)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n={tool.icon} s={15} c="var(--ac)"/>
          </div>
          <div>
            <div style={{fontWeight:500,fontSize:13}}>{tool.label}</div>
            <div style={{fontSize:11,color:"var(--tm)"}}>{tool.desc}</div>
          </div>
        </div>
        <button className="bg" style={{padding:"5px 9px"}} onClick={onClose}><Ic n="x" s={13}/></button>
      </div>
      <div style={{padding:18}}>
        {status==="done"?(
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
              <Ic n="check" s={20} c="var(--ok)"/>
            </div>
            <div style={{fontWeight:500,marginBottom:4}}>{T.conv_done}</div>
            <div style={{fontSize:12,color:"var(--tm)",marginBottom:18}}>
              {files.length} {files.length===1?T.done_sub_s:T.done_sub_p}
            </div>
            <button className="bg" onClick={dl}>{T.other}</button>
          </div>
        ):status==="error"?(
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{width:46,height:46,borderRadius:"50%",background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
              <Ic n="x" s={20} c="#B91C1C"/>
            </div>
            <div style={{fontWeight:600,marginBottom:10,color:"#B91C1C",fontSize:14}}>{T.err_title}</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:6,maxWidth:340,margin:"0 auto 8px",lineHeight:1.6}}>{errMsg}</div>
            <div style={{fontSize:11,color:"var(--tm)",marginBottom:20}}>{T.err_suggest}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button className="bg" onClick={()=>{ setStatus("idle"); setFiles([]); }}>{T.cancel}</button>
              <button className="bp" onClick={()=>setStatus("idle")}>{T.err_retry}</button>
            </div>
          </div>
        ):(
          <>
            {/* Input oculto — se resetea tras cada selección para poder añadir el mismo archivo */}
            <input ref={ref} type="file" accept={[...(tool.accepts||[]),...(tool.mimeTypes||[])].join(",")} multiple={!!tool.multi}
              style={{display:"none"}}
              onChange={e=>{ addFiles(e.target.files); e.target.value=""; }}/>

            {/* Zona drop — solo se muestra si no hay archivos o la herramienta no es multi */}
            {(!tool.multi || files.length===0) && (
              <div className={`dz ${drag?"ov":""}`}
                style={{padding:"28px 18px",textAlign:"center",marginBottom:12}}
                onDragOver={e=>{e.preventDefault();setDrag(true)}}
                onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
                onClick={()=>ref.current?.click()}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                  <Ic n="upload" s={22} c={drag?"var(--ac)":"var(--tm)"}/>
                </div>
                <div style={{fontWeight:500,fontSize:13,marginBottom:2,color:drag?"var(--ac)":"var(--t1)"}}>
                  {tool.multi?T.drag_multi:T.drag_single}
                </div>
                <div style={{fontSize:11,color:"var(--tm)"}}>{T.click_hint} · {tool.accepts.join(", ")} · {T.max_size}</div>
              </div>
            )}

            {/* Lista de archivos + botón añadir más (solo herramientas multi) */}
            {files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:tool.multi?8:0}}>
                  {files.map((f,i)=>(
                    <FileRow key={i} file={f} onRemove={()=>setFiles(p=>p.filter((_,j)=>j!==i))}/>
                  ))}
                </div>
                {tool.multi&&(
                  <div
                    className={`dz ${drag?"ov":""}`}
                    style={{padding:"12px",textAlign:"center",cursor:"pointer",borderStyle:"dashed"}}
                    onDragOver={e=>{e.preventDefault();setDrag(true)}}
                    onDragLeave={()=>setDrag(false)}
                    onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
                    onClick={()=>ref.current?.click()}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--t2)"}}>
                      <Ic n="upload" s={13} c="var(--t2)"/>
                      Añadir más archivos
                    </div>
                  </div>
                )}
              </div>
            )}
            {tool.id==="split"&&files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:5}}>{T.pages_label}</div>
                <input value={range} onChange={e=>setRange(e.target.value)} placeholder={T.pages_ph}
                  className="fi-inp" style={{fontFamily:"'DM Mono',monospace",fontSize:12}}
                  onFocus={e=>e.target.style.borderColor="var(--ac)"}
                  onBlur={e=>e.target.style.borderColor="var(--bd)"}/>
              </div>
            )}
            {tool.id==="rotate"&&files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>Ángulo de rotación</div>
                <div style={{display:"flex",gap:6}}>
                  {[[90,"90°"],[180,"180°"],[270,"270°"]].map(([deg,lbl])=>(
                    <button key={deg} onClick={()=>setRotation(deg)}
                      style={{flex:1,padding:"7px 0",border:`1px solid ${rotation===deg?"var(--ac)":"var(--bd)"}`,borderRadius:6,
                        fontSize:13,fontFamily:"'DM Mono',monospace",background:rotation===deg?"var(--al)":"transparent",
                        color:rotation===deg?"var(--ac)":"var(--t2)",cursor:"pointer",fontWeight:rotation===deg?500:400,transition:"all .16s"}}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tool.id==="compress"&&files.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:500,color:"var(--t2)",marginBottom:6}}>{T.compress_level}</div>
                <div style={{display:"flex",gap:6}}>
                  {[["low",T.q_low],["medium",T.q_med],["high",T.q_high]].map(([q,l])=>(
                    <button key={q} onClick={()=>setQuality(q)}
                      style={{flex:1,padding:"7px 0",border:`1px solid ${quality===q?"var(--ac)":"var(--bd)"}`,borderRadius:6,
                        fontSize:12,fontFamily:"'DM Sans',sans-serif",background:quality===q?"var(--al)":"transparent",
                        color:quality===q?"var(--ac)":"var(--t2)",cursor:"pointer",fontWeight:quality===q?500:400,transition:"all .16s"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {status==="proc"&&(
              <div className="m-steps" style={{marginBottom:16,padding:"16px",background:"var(--al)",borderRadius:10,textAlign:"center"}}>
                {/* Pasos */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:12}}>
                  {[T.step_read, T.step_proc].map((label,i)=>{
                    const idx = i+1;
                    const isDone = step > idx;
                    const isActive = step === idx;
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center"}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div className={`step-dot ${isActive?"active":isDone?"done":""}`}/>
                          <span style={{fontSize:10,color:isActive?"var(--ac)":isDone?"var(--ok)":"var(--tm)",fontWeight:isActive?500:400,transition:"color .3s",whiteSpace:"nowrap"}}>
                            {label}
                          </span>
                        </div>
                        {i<1&&<div style={{width:48,height:1,background:step>idx?"var(--ok)":"var(--bd)",margin:"0 8px",marginBottom:14,transition:"background .3s"}}/>}
                      </div>
                    );
                  })}
                </div>
                {/* Barra */}
                <div className="tr" style={{maxWidth:200,margin:"0 auto"}}>
                  <div className="fill" style={{animationDuration: step===1?"0.8s":"2s"}}/>
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="bg" onClick={onClose}>{T.cancel}</button>
              <button className="bp" disabled={!files.length||status==="proc"} onClick={convert}>
                {status==="proc"?<><div className="spn"/>{T.processing}</>:<><Ic n="arrow" s={14}/>{T.convert}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[]);
  return (
    <div className="toast">
      <Ic n={type==="err"?"x":"check"} s={13} c={type==="err"?"#F87171":"#4ADE80"}/>
      {message}
    </div>
  );
}

/* ── App ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang]       = useState(detectLang);
  const [active, setActive]   = useState(null);
  const [modal, setModal]     = useState(null);
  const [toast, setToast]     = useState(null);
  const [heroDrag, setHeroDrag] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const [count, setCount] = useState(() => parseInt(localStorage.getItem('morf_count')||'0'));
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('morf_history')||'[]'); } catch(e){ return []; }
  });

  const addToHistory = (filename, toolLabel) => {
    setHistory(prev => {
      const entry = { filename, tool: toolLabel, date: new Date().toISOString() };
      const next = [entry, ...prev].slice(0, 10);
      localStorage.setItem('morf_history', JSON.stringify(next));
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('morf_history');
  };

  const bumpCount = () => {
    setCount(c => {
      const n = c + 1;
      localStorage.setItem('morf_count', n);
      return n;
    });
  };
  useEffect(() => {
    document.body.style.background = dark ? '#0F1117' : '#F9F9F8';
  }, [dark]);

  const T = LANGS[lang];
  const showToast = (msg, type="ok") => setToast({msg,type});

  // Build tools with translated labels
  const TOOLS = TOOL_BASE.map((t,i) => ({ ...t, ...T.t[i] }));

  const heroDrop = e => {
    e.preventDefault(); setHeroDrag(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = "."+file.name.split(".").pop().toLowerCase();
    const mime = file.type.toLowerCase();
    if (ext === ".odt" || mime === "application/vnd.oasis.opendocument.text") {
      showToast(T.err_odt,"err");
      return;
    }
    const found = TOOLS.find(t =>
      (t.accepts||[]).includes(ext) ||
      (t.mimeTypes||[]).includes(mime)
    );
    if (found){ setActive(found); showToast(`${T.detected}: ${found.label}`); }
    else showToast(T.unknown_fmt,"err");
  };

  const modalCfg = {
    privacy:{ title:T.modal_privacy, icon:"shield" },
    terms:  { title:T.modal_terms,   icon:"file"   },
    contact:{ title:T.modal_contact, icon:"mail"   },
    api:    { title:T.modal_api,     icon:"code"   },
  };

  return (
    <LangCtx.Provider value={T}>
      <div className={`m${dark?" dark":""}`}>
        <style>{css}</style>

        {/* Header */}
        <header style={{borderBottom:"1px solid var(--bd)",background:"var(--sf)",position:"sticky",top:0,zIndex:100}}>
          <div className="m-header-inner" style={{maxWidth:960,margin:"0 auto",padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <Ic n="logo" s={20} c="var(--ac)" sw={1.6}/>
              <span className="m-logo-text" style={{fontWeight:600,fontSize:15,letterSpacing:"-.02em"}}>morf</span>
              <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",background:"var(--al)",color:"var(--ac)",padding:"2px 6px",borderRadius:3,fontWeight:500}}>BETA</span>
            </div>
            <nav style={{display:"flex",gap:16,alignItems:"center"}}>
              <button className="nl m-nav-privacy" onClick={()=>setModal("privacy")}>{T.nav_privacy}</button>
              <button className="nl m-nav-labels" onClick={()=>setModal("api")}>{T.nav_api}</button>
              <button className="nl m-nav-labels" onClick={()=>setModal("contact")}>{T.nav_help}</button>
              <button onClick={()=>setDark(d=>!d)}
                style={{background:"transparent",border:"1px solid var(--bd)",borderRadius:6,
                  padding:"5px 8px",cursor:"pointer",color:"var(--t2)",display:"flex",
                  alignItems:"center",transition:"all .16s"}}
                title={dark?"Modo claro":"Modo oscuro"}>
                <Ic n={dark?"sun":"moon"} s={14} c="var(--t2)"/>
              </button>
              <LangPicker lang={lang} setLang={setLang}/>
            </nav>
          </div>
        </header>

        <div className="m-hero" style={{maxWidth:960,margin:"0 auto",padding:"48px 20px 64px"}}>
          {/* Hero */}
          <div className="fu" style={{textAlign:"center",marginBottom:44}}>
            {/* Badge */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:20,padding:"3px 11px 3px 7px",fontSize:11,color:"var(--tm)",marginBottom:24,fontFamily:"'DM Mono',monospace"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#22C55E",display:"inline-block"}}/>
              {T.tagline}
            </div>

            {/* Título */}
            <h1 style={{fontSize:"clamp(30px,5vw,52px)",fontWeight:300,letterSpacing:"-.03em",lineHeight:1.14,marginBottom:18,maxWidth:640,margin:"0 auto 18px"}}>
              {T.hero_h1a}<br/>
              <span style={{fontWeight:700,background:"linear-gradient(135deg,var(--ac),var(--ah))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                {T.hero_h1b}
              </span>
            </h1>

            {/* Subtítulo */}
            <p style={{fontSize:15,color:"var(--t2)",maxWidth:480,margin:"0 auto 24px",lineHeight:1.75,fontWeight:300}}>
              {T.hero_sub}
            </p>

            {/* CTA */}
            <button className="bp" onClick={()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"})}
              style={{fontSize:14,padding:"12px 28px",borderRadius:8,gap:8,marginBottom:20}}>
              <Ic n="zap" s={15} c="#fff"/>
              {T.hero_cta}
            </button>

            {/* Contador */}
            {count>0&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:4}}>
                <span style={{fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:600,color:"var(--ac)"}}>
                  {count.toLocaleString()}
                </span>
                <span style={{fontSize:12,color:"var(--tm)"}}>{T.counter}</span>
              </div>
            )}
          </div>

          {/* Hero drop */}
          <div className={`dz fu fu1 m-hero-drop ${heroDrag?"ov":""}`}
            style={{padding:"40px 32px",textAlign:"center",maxWidth:580,margin:"0 auto 48px",
              background:heroDrag?"var(--al)":"var(--sf)",transition:"all .2s",cursor:"pointer",
              boxShadow:heroDrag?"0 0 0 3px var(--ac)":"0 1px 3px rgba(0,0,0,.06)"}}
            onDragOver={e=>{e.preventDefault();setHeroDrag(true)}}
            onDragLeave={()=>setHeroDrag(false)}
            onDrop={heroDrop}
            onClick={()=>document.getElementById("tools")?.scrollIntoView({behavior:"smooth"})}>
            {/* Icono animado */}
            <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
              <div style={{width:60,height:60,borderRadius:14,
                background:heroDrag?"var(--ac)":"linear-gradient(135deg,#E8EDF2,#F5F5F3)",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
                boxShadow:heroDrag?"0 4px 16px rgba(28,48,66,.3)":"0 2px 8px rgba(0,0,0,.08)"}}>
                <Ic n="upload" s={24} c={heroDrag?"#fff":"var(--ac)"}/>
              </div>
            </div>
            <div style={{fontWeight:600,marginBottom:6,fontSize:15,color:heroDrag?"var(--ac)":"var(--t1)",transition:"color .2s"}}>
              {T.hero_drop}
            </div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:10,lineHeight:1.5}}>{T.hero_drop_sub}</div>
            <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:10}}>
              <Tag type="pdf"/><Tag type="docx"/><Tag type="img"/>
            </div>
            <div style={{fontSize:10,color:"var(--tm)",fontFamily:"'DM Mono',monospace",opacity:.7}}>{T.max_size}</div>
          </div>

          {/* Tools */}
          <div id="tools">
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:600}}>{T.tools_title}</span>
              <span style={{fontSize:11,color:"var(--tm)",fontFamily:"'DM Mono',monospace"}}>{TOOLS.length} {T.tools_count}</span>
            </div>
            <div className="grid" style={{marginBottom:14}}>
              {TOOLS.map((t,i)=>(
                <div key={t.id} className={`card fu fu${i+1} ${active?.id===t.id?"on":""}`}
                  onClick={()=>setActive(p=>p?.id===t.id?null:t)}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{width:34,height:34,borderRadius:7,background:active?.id===t.id?"var(--al)":"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .16s"}}>
                      <Ic n={t.icon} s={15} c={active?.id===t.id?"var(--ac)":"var(--t2)"}/>
                    </div>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      <Tag type={t.from}/><span style={{color:"var(--tm)",fontSize:10}}>→</span><Tag type={t.to}/>
                    </div>
                  </div>
                  <div style={{fontWeight:500,fontSize:13,marginBottom:3}}>{t.label}</div>
                  <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}>{t.desc}</div>
                </div>
              ))}
            </div>
            {active&&<Panel tool={active} onClose={()=>setActive(null)} showToast={showToast} bumpCount={bumpCount} addToHistory={addToHistory}/>}
          </div>

          {/* Features */}
          <div className="m-feat" style={{borderTop:"1px solid var(--bd)",marginTop:48,paddingTop:36,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:20}}>
            {T.feat.map(([title,desc],i)=>(
              <div key={i} style={{display:"flex",gap:11,alignItems:"flex-start"}}>
                <div style={{width:28,height:28,borderRadius:6,background:"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ic n={["file","check","download","compress"][i]} s={13} c="var(--t2)"/>
                </div>
                <div>
                  <div style={{fontWeight:500,fontSize:12,marginBottom:1}}>{title}</div>
                  <div style={{fontSize:11,color:"var(--tm)",lineHeight:1.5}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historial */}
        {history.length > 0 && (
          <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px 48px"}}>
            <div style={{borderTop:"1px solid var(--bd)",paddingTop:32}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Ic n="download" s={14} c="var(--t2)"/>
                  <span style={{fontWeight:600,fontSize:13}}>{T.hist_title}</span>
                </div>
                <button className="nl" style={{fontSize:11,color:"var(--tm)"}} onClick={clearHistory}>{T.hist_clear}</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {history.map((h,i)=>{
                  const d = new Date(h.date);
                  const dateStr = d.toLocaleDateString(T.code==="en"?"en-GB":T.code==="de"?"de-DE":T.code==="fr"?"fr-FR":T.code==="pt"?"pt-PT":"es-ES",
                    {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                      background:"var(--sf)",border:"1px solid var(--bd)",borderRadius:8,
                      animation:`fu .2s ease ${i*0.04}s both`}}>
                      <Ic n="file" s={13} c="var(--tm)"/>
                      <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--t1)"}}>{h.filename}</span>
                      <span style={{fontSize:11,color:"var(--ac)",fontWeight:500,flexShrink:0,
                        background:"var(--al)",padding:"2px 7px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>
                        {h.tool}
                      </span>
                      <span style={{fontSize:10,color:"var(--tm)",flexShrink:0}}>{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer style={{borderTop:"1px solid var(--bd)",background:"var(--sf)"}}>
          <div style={{maxWidth:960,margin:"0 auto",padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <Ic n="logo" s={13} c="var(--tm)" sw={1.5}/>
              <span style={{fontSize:12,color:"var(--tm)"}}>{T.footer_copy}</span>
            </div>
            <div style={{display:"flex",gap:16}}>
              <button className="fl" onClick={()=>setModal("privacy")}>{T.modal_privacy}</button>
              <button className="fl" onClick={()=>setModal("terms")}>{T.modal_terms}</button>
              <button className="fl" onClick={()=>setModal("contact")}>{T.modal_contact}</button>
              <button className="fl" onClick={()=>setModal("api")}>{T.modal_api}</button>
            </div>
          </div>
        </footer>

        {/* Modals */}
        {modal&&(
          <Modal title={modalCfg[modal].title} icon={modalCfg[modal].icon} onClose={()=>setModal(null)}>
            {modal==="privacy"&&<Privacy/>}
            {modal==="terms"  &&<Terms/>}
            {modal==="contact"&&<Contact showToast={showToast} onClose={()=>setModal(null)}/>}
            {modal==="api"    &&<API/>}
          </Modal>
        )}

        {toast&&<Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      </div>
    </LangCtx.Provider>
  );
}