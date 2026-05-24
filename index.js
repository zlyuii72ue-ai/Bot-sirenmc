const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, 
    TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, REST, Routes, SlashCommandBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    PREFIX: "!"
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

const IMAGEN_SIRENMC = "https://cdn.discordapp.com/attachments/1498839434647441478/1508063329845776455/Screenshot_20260524-050445.Google.png?ex=6a142cec&is=6a12db6c&hm=d982b9f4852e2e8c4a4307e68c3f90426cd66f69e6bb34a5f83a249f9895853c&";
const dbPath = path.join(__dirname, 'database.json');

let db = { 
    tickets: { canal: null, categoria: null, rolStaff: null }, 
    bienvenidas: { canal: null }, 
    boosts: { canal: null },
    sugerencias: { canal: null },
    logs: { canal: null },
    warns: {},
    filtros: { antilinks: true }
};

if (fs.existsSync(dbPath)) {
    try { 
        const data = fs.readFileSync(dbPath, 'utf8');
        if (data) db = JSON.parse(data); 
    } catch (e) {
        console.error("Error al cargar la base de datos, creando una nueva estructurada.");
    }
}
const saveDB = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

const slashCommandsData = [
    new SlashCommandBuilder().setName('help').setDescription('Comandos disponibles para los usuarios.'),
    new SlashCommandBuilder().setName('helpadmin').setDescription('Comandos de administración y configuración de la network.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('ip').setDescription('Datos de conexión oficiales de SirenMc.'),
    new SlashCommandBuilder().setName('testbienvenida').setDescription('Simula un evento de entrada de miembro.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('testboost').setDescription('Simula un evento de Nitro Boost en el servidor.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder().setName('setcanal').setDescription('Configura los canales principales del bot.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('tipo').setDescription('Módulo a enlazar').setRequired(true).addChoices(
            { name: 'Bienvenidas', value: 'bienvenidas' }, 
            { name: 'Boosts', value: 'boosts' },
            { name: 'Sugerencias', value: 'sugerencias' },
            { name: 'Logs', value: 'logs' }
        ))
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal de destino seleccionado').setRequired(true)),
        
    new SlashCommandBuilder().setName('tickets').setDescription('Monta el panel interactivo de soporte.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('canal_panel').setDescription('Canal donde se enviará el menú').setRequired(true))
        .addChannelOption(opt => opt.setName('categoria').setDescription('Categoría para alojar los tickets de soporte').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_staff').setDescription('Rol del equipo de Staff encargado').setRequired(true)),

    new SlashCommandBuilder().setName('sugerir').setDescription('Envía una sugerencia para que la comunidad vote.')
        .addStringOption(opt => opt.setName('contenido').setDescription('Detalla tu propuesta para el servidor').setRequired(true)),

    new SlashCommandBuilder().setName('ban').setDescription('Banea de forma permanente a un usuario del servidor.').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la sanción impuesta').setRequired(false)),

    new SlashCommandBuilder().setName('kick').setDescription('Expulsa a un usuario fuera de la comunidad.').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo del kick').setRequired(false)),

    new SlashCommandBuilder().setName('mute').setDescription('Aísla temporalmente a un usuario para que no hable en los chats.').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a mutear').setRequired(true))
        .addIntegerOption(opt => opt.setName('tiempo').setDescription('Duración del aislamiento en minutos').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón del aislamiento').setRequired(false)),

    new SlashCommandBuilder().setName('unmute').setDescription('Remueve el aislamiento temporal a un usuario.').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a desmutear').setRequired(true)),

    new SlashCommandBuilder().setName('warn').setDescription('Aplica una advertencia formal a un usuario de la base de datos.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Causa del aviso administrativo').setRequired(true)),

    new SlashCommandBuilder().setName('warns').setDescription('Consulta el historial de infracciones de un miembro.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a revisar').setRequired(true)),

    new SlashCommandBuilder().setName('clearwarns').setDescription('Limpia por completo el historial de avisos de alguien.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario indultado').setRequired(true)),

    new SlashCommandBuilder().setName('clear').setDescription('Borra de forma masiva una cantidad fija de mensajes del chat.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Número de mensajes a purgar (1-100)').setRequired(true)),

    new SlashCommandBuilder().setName('toggleantilinks').setDescription('Activa o desactiva el filtro automático anti-invitaciones de Discord.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`SirenMc Bot Corriendo al 100%: ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });
    if (config.CLIENT_ID) {
        const rest = new REST({ version: '10' }).setToken(config.TOKEN);
        try { 
            await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: slashCommandsData }); 
            console.log("Comandos e infraestructura cargados correctamente.");
        } catch (e) {
            console.error("Error al inyectar comandos globales:", e);
        }
    }
});

async function ejecutarHelp() {
    const embed = new EmbedBuilder()
        .setTitle('Comandos Públicos — SirenMc')
        .setDescription('Usa estos comandos directamente en cualquier canal autorizado:\n\n• `/help` o `!help` - Abre esta interfaz de ayuda.\n• `/ip` o `!ip` - Te da los accesos para ingresar a la network.\n• `/sugerir` - Envía una idea al canal de votaciones comunitarias.\n• `/warns` - Revisa tu historial de llamadas de atención actuales.')
        .setColor('#007BFF')
        .setThumbnail(IMAGEN_SIRENMC)
        .setFooter({ text: 'SirenMc Network • Comunidad' });
    return { embeds: [embed] };
}

async function ejecutarHelpAdmin() {
    const embed = new EmbedBuilder()
        .setTitle('Consola de Comandos del Staff')
        .setDescription('Herramientas exclusivas para el control, moderación y ajuste técnico del bot:\n\n**Configuración Inicial:**\n• `/tickets` o `!tickets` - Despliega el panel principal de soporte técnico.\n• `/setcanal` o `!setcanal` - Vincula los logs, sugerencias, bienvenidas o boosts.\n• `/toggleantilinks` - Modifica el estado del escudo de filtrado de invitaciones externas.\n\n**Sanciones y Control Directo:**\n• `/ban` / `/kick` - Gestión rigurosa de usuarios problemáticos.\n• `/mute` / `/unmute` - Control temporal de toxicidad en canales de texto.\n• `/warn` / `/clearwarns` - Registro de advertencias acumulativas.\n• `/clear` - Purga rápida del historial visible del chat.')
        .setColor('#0056b3')
        .setFooter({ text: 'SirenMc Network • Consola Interna' });
    return { embeds: [embed] };
}

async function ejecutarIp() {
    const embed = new EmbedBuilder()
        .setTitle('Acceso Oficial a SirenMc Network')
        .setColor('#00C3FF')
        .setThumbnail(IMAGEN_SIRENMC)
        .setDescription('Usa las siguientes credenciales para unirte a nuestras modalidades activas:\n\n• **Edición Java (PC):**\nIP: `play.sirenmc.net` (Versión 1.16.5 hasta la más nueva)\n\n• **Edición Bedrock (Consolas/Móvil):**\nIP: `play.sirenmc.net` \nPuerto por defecto: `19132`\n\n• **Soporte de Compras:**\nTienda oficial: [tienda.sirenmc.net](https://tienda.sirenmc.net)')
        .setFooter({ text: 'SirenMc Network • Conexión Estable' });
    return { embeds: [embed] };
}

async function generarPanelTickets(guild, canalPanel, categoria, rolStaff) {
    db.tickets = { canal: canalPanel.id, categoria: categoria.id, rolStaff: rolStaff.id };
    saveDB();

    const embed = new EmbedBuilder()
        .setTitle('Centro de Soporte — SirenMc')
        .setDescription('# ¿Necesitas ayuda de nuestro Staff?\n\nSi experimentas problemas técnicos, deseas reportar conductas fraudulentas o tienes inconvenientes con transacciones de la tienda, abre un caso desplegando el menú de abajo.\n\n**Parámetros para una atención correcta:**\n• Describe tu situación con capturas, logs o explicaciones concisas.\n• No crees canales vacíos o sin intenciones reales de seguimiento.\n• La atención se realiza por orden de llegada, por favor evita saturar los mensajes directos de los administradores.')
        .setColor('#007BFF')
        .setImage(IMAGEN_SIRENMC)
        .setFooter({ text: 'SirenMc Network • Soporte al Jugador', iconURL: guild.iconURL() });

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('menu_tickets').setPlaceholder('Selecciona el motivo de tu solicitud...').addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setDescription('Consultas sobre rangos, vinculaciones o dudas generales.'),
            new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setDescription('Errores de carga, problemas de ping o caídas de sesión.'),
            new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setDescription('Usuarios utilizando software ilegal, faltas de respeto o dupeos.'),
            new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setDescription('Soporte dedicado a compras no recibidas dentro del servidor.'),
            new StringSelectMenuOptionBuilder().setLabel('Reportes al Staff').setValue('Reportes').setDescription('Revisiones de malas prácticas cometidas por moderadores.'),
            new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setDescription('Fallos del entorno de juego que comprometan la jugabilidad.'),
            new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setDescription('Revisiones de muertes causadas por fallos técnicos o tirones.'),
            new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setDescription('Procesos de reclamación de baneos injustificados.')
        )
    );
    await canalPanel.send({ embeds: [embed], components: [menu] });
}

async function enviarLogMod(guild, titulo, descripcion, color) {
    if (!db.logs.canal) return;
    const canal = guild.channels.cache.get(db.logs.canal);
    if (!canal) return;
    const logEmbed = new EmbedBuilder().setTitle(titulo).setDescription(descripcion).setColor(color).setTimestamp();
    try { await canal.send({ embeds: [logEmbed] }); } catch (e) {}
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (db.filtros.antilinks && message.content.match(/(discord\.(gg|me|io)|discordapp\.com\/invite)/i)) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await message.delete().catch(() => {});
            return message.channel.send(`${message.author}, los enlaces de otros servidores de Discord están totalmente prohibidos en esta comunidad.`).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
        }
    }

    if (!message.content.startsWith(config.PREFIX)) return;
    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'help') return message.reply(await ejecutarHelp());
    if (command === 'ip') return message.reply(await ejecutarIp());
    
    if (command === 'helpadmin') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('Acceso denegado. Se requieren credenciales de Administrador.');
        return message.reply(await ejecutarHelpAdmin());
    }

    if (command === 'setcanal') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const tipo = args[0]?.toLowerCase(), canal = message.mentions.channels.first();
        if (!tipo || !canal || !['bienvenidas', 'boosts', 'sugerencias', 'logs'].includes(tipo)) {
            return message.reply('Estructura incorrecta. Usa: `!setcanal [bienvenidas/boosts/sugerencias/logs] #canal`');
        }
        db[tipo].canal = canal.id; saveDB();
        return message.reply(`El módulo de **${tipo}** se enlazó correctamente al canal ${canal}.`);
    }

    if (command === 'tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const canalPanel = message.mentions.channels.first(), categoriaId = args[1], rolStaff = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
        const categoriaCanal = message.guild.channels.cache.get(categoriaId);
        if (!canalPanel || !categoriaCanal || !rolStaff) {
            return message.reply('Estructura incorrecta. Usa: `!tickets <#canal-panel> <ID-categoria> <@RolStaff>`');
        }
        await generarPanelTickets(message.guild, canalPanel, categoriaCanal, rolStaff);
        return message.reply(`Panel de control montado de forma exitosa en el canal ${canalPanel}.`);
    }

    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        if (command === 'testbienvenida') { client.emit('guildMemberAdd', message.member); return message.reply('Simulación de bienvenida inyectada.'); }
        if (command === 'testboost') { client.emit('guildMemberUpdate', { ...message.member, premiumSince: null }, { ...message.member, premiumSince: new Date() }); return message.reply('Simulación de Nitro Boost inyectada.'); }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, guild, member, channel } = interaction;

        if (commandName === 'help') return interaction.reply(await ejecutarHelp());
        if (commandName === 'ip') return interaction.reply(await ejecutarIp());
        if (commandName === 'helpadmin') return interaction.reply(await ejecutarHelpAdmin());

        if (commandName === 'setcanal') {
            const tipo = options.getString('tipo'), canal = options.getChannel('canal');
            db[tipo].canal = canal.id; saveDB();
            return interaction.reply({ content: `Canal del módulo **${tipo}** establecido en ${canal} de forma correcta.`, ephemeral: true });
        }

        if (commandName === 'tickets') {
            await generarPanelTickets(guild, options.getChannel('canal_panel'), options.getChannel('categoria'), options.getRole('rol_staff'));
            return interaction.reply({ content: 'El panel automatizado de tickets se ha inyectado con éxito.', ephemeral: true });
        }

        if (commandName === 'testbienvenida') { client.emit('guildMemberAdd', member); return interaction.reply({ content: 'Simulación lanzada.', ephemeral: true }); }
        if (commandName === 'testboost') { client.emit('guildMemberUpdate', { ...member, premiumSince: null }, { ...member, premiumSince: new Date() }); return interaction.reply({ content: 'Simulación lanzada.', ephemeral: true }); }

        if (commandName === 'toggleantilinks') {
            db.filtros.antilinks = !db.filtros.antilinks; saveDB();
            return interaction.reply({ content: `El sistema Anti-Links externos ahora se encuentra: **${db.filtros.antilinks ? 'ACTIVADO' : 'DESACTIVADO'}**.` });
        }

        if (commandName === 'sugerir') {
            if (!db.sugerencias.canal) return interaction.reply({ content: 'El módulo de sugerencias no está configurado por la administración.', ephemeral: true });
            const canalSug = guild.channels.cache.get(db.sugerencias.canal);
            if (!canalSug) return interaction.reply({ content: 'No se encuentra el canal asignado para las sugerencias.', ephemeral: true });

            await interaction.deferReply({ ephemeral: true });
            const contenido = options.getString('contenido');
            
            const sugEmbed = new EmbedBuilder()
                .setTitle('Nueva Propuesta Comunitaria')
                .setDescription(`${contenido}`)
                .setColor('#F1C40F')
                .addFields({ name: 'Enviada por:', value: `${interaction.user} (${interaction.user.tag})` })
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            const msg = await canalSug.send({ embeds: [sugEmbed] });
            await msg.react('👍'); await msg.react('👎');
            return interaction.editReply({ content: 'Tu propuesta ha sido enviada al canal correspondiente para votación general.' });
        }

        if (commandName === 'clear') {
            const cant = options.getInteger('cantidad');
            if (cant < 1 || cant > 100) return interaction.reply({ content: 'Establece un rango válido entre 1 y 100 mensajes a borrar.', ephemeral: true });
            
            await channel.bulkDelete(cant, true);
            await enviarLogMod(guild, 'Purga de Mensajes', `El Moderador ${interaction.user} eliminó **${cant}** mensajes en el canal ${channel}.`, '#95A5A6');
            return interaction.reply({ content: `Se limpiaron **${cant}** mensajes de este canal correctamente.`, ephemeral: true });
        }

        if (commandName === 'ban') {
            const target = options.getUser('usuario'), razon = options.getString('razon') || 'Sanción aplicada por desacato de normativas.';
            const miembro = guild.members.cache.get(target.id);
            if (miembro && !miembro.bannable) return interaction.reply({ content: 'No poseo los rangos necesarios para sancionar a este usuario.', ephemeral: true });

            await guild.members.ban(target.id, { reason: razon });
            await enviarLogMod(guild, 'Usuario Sancionado (Ban)', `**Objetivo:** ${target.tag}\n**Moderador:** ${interaction.user}\n**Causa:** ${razon}`, '#E74C3C');
            return interaction.reply({ content: `El usuario **${target.tag}** ha sido bloqueado del servidor permanentemente.` });
        }

        if (commandName === 'kick') {
            const target = options.getUser('usuario'), razon = options.getString('razon') || 'Expulsado por orden administrativa.';
            const miembro = guild.members.cache.get(target.id);
            if (!miembro) return interaction.reply({ content: 'El miembro indicado no se encuentra dentro del gremio.', ephemeral: true });
            if (!miembro.kickable) return interaction.reply({ content: 'Los roles jerárquicos impiden realizar esta expulsión.', ephemeral: true });

            await miembro.kick(razon);
            await enviarLogMod(guild, 'Usuario Expulsado (Kick)', `**Objetivo:** ${target.tag}\n**Moderador:** ${interaction.user}\n**Causa:** ${razon}`, '#E67E22');
            return interaction.reply({ content: `El usuario **${target.tag}** fue expulsado fuera de la comunidad.` });
        }

        if (commandName === 'mute') {
            const target = options.getUser('usuario'), tiempo = options.getInteger('tiempo'), razon = options.getString('razon') || 'Aislamiento temporal.';
            const miembro = guild.members.cache.get(target.id);
            if (!miembro) return interaction.reply({ content: 'El miembro indicado no reside en el servidor.', ephemeral: true });

            try {
                await miembro.timeout(tiempo * 60 * 1000, razon);
                await enviarLogMod(guild, 'Usuario Aislado (Mute)', `**Objetivo:** ${target.tag}\n**Moderador:** ${interaction.user}\n**Duración:** ${tiempo} minutos\n**Causa:** ${razon}`, '#34495E');
                return interaction.reply({ content: `Se aplicó un aislamiento preventivo a **${target.tag}** por ${tiempo} minutos.` });
            } catch (e) {
                return interaction.reply({ content: 'Ocurrió un error al intentar aplicar el aislamiento. Revisa mis jerarquías.', ephemeral: true });
            }
        }

        if (commandName === 'unmute') {
            const target = options.getUser('usuario');
            const miembro = guild.members.cache.get(target.id);
            if (!miembro) return interaction.reply({ content: 'Miembro no localizado.', ephemeral: true });

            await miembro.timeout(null);
            await enviarLogMod(guild, 'Aislamiento Removido', `El Staff ${interaction.user} revocó el aislamiento de ${target.tag}.`, '#2ECC71');
            return interaction.reply({ content: `El aislamiento de **${target.tag}** ha sido removido con éxito.` });
        }

        if (commandName === 'warn') {
            const target = options.getUser('usuario'), razon = options.getString('razon');
            if (!db.warns[target.id]) db.warns[target.id] = [];
            
            db.warns[target.id].push({ mod: interaction.user.tag, reason: razon, date: new Date().toLocaleDateString() });
            saveDB();

            await enviarLogMod(guild, 'Advertencia Registrada (Warn)', `**Objetivo:** ${target.tag}\n**Moderador:** ${interaction.user}\n**Infracción:** ${razon}\n**Total acumulado:** ${db.warns[target.id].length}`, '#F39C12');
            return interaction.reply({ content: `Se cargó una advertencia formal a **${target.tag}**. Historial actual: ${db.warns[target.id].length} infracciones.` });
        }

        if (commandName === 'warns') {
            const target = options.getUser('usuario');
            const lista = db.warns[target.id] || [];
            if (lista.length === 0) return interaction.reply({ content: `El usuario **${target.tag}** cuenta con un historial limpio.` });

            const embed = new EmbedBuilder().setTitle(`Registro de Infracciones — ${target.tag}`).setColor('#F39C12');
            lista.forEach((w, i) => {
                embed.addFields({ name: `Aviso #${i + 1} (${w.date})`, value: `**Staff:** ${w.mod}\n**Causa:** ${w.reason}` });
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'clearwarns') {
            const target = options.getUser('usuario');
            db.warns[target.id] = []; saveDB();
            await enviarLogMod(guild, 'Historial de Avisos Limpiado', `El Administrador ${interaction.user} eliminó todas las advertencias de ${target.tag}.`, '#2ECC71');
            return interaction.reply({ content: `El historial de infracciones de **${target.tag}** fue reestablecido a cero.` });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const cat = interaction.values[0];
        if (!db.tickets.categoria || !db.tickets.rolStaff) return interaction.reply({ content: 'El sistema de soporte no ha sido inicializado por el Staff.', ephemeral: true });

        const actual = interaction.guild.channels.cache.find(c => c.parentId === db.tickets.categoria && c.name.includes(interaction.user.username.toLowerCase()));
        if (actual) return interaction.reply({ content: `Cuentas con una consulta en proceso activa dentro de ${actual}.`, ephemeral: true });

        const modal = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Ticket: ${cat}`);
        const nick = new TextInputBuilder().setCustomId('f_nick').setLabel('Tu Nick:').setPlaceholder('Ingresa tu nombre exacto dentro del juego').setStyle(TextInputStyle.Short).setRequired(true);
        const motivo = new TextInputBuilder().setCustomId('f_motivo').setLabel('Motivo:').setPlaceholder('Detalla minuciosamente los acontecimientos').setStyle(TextInputStyle.Paragraph).setRequired(true);

        if (cat === 'Revives') {
            motivo.setLabel('¿Cómo moriste? (Motivo):');
            modal.addComponents(new ActionRowBuilder().addComponents(nick), new ActionRowBuilder().addComponents(motivo));
        } else if (cat === 'Reportar') {
            const rep = new TextInputBuilder().setCustomId('f_extra').setLabel('Nick del usuario reportado:').setPlaceholder('¿A qué jugador deseas reportar?').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nick), new ActionRowBuilder().addComponents(rep), new ActionRowBuilder().addComponents(motivo));
        } else if (cat === 'Tienda') {
            const trans = new TextInputBuilder().setCustomId('f_extra').setLabel('ID de Transacción / Factura:').setPlaceholder('Pega el comprobante enviado a tu correo').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nick), new ActionRowBuilder().addComponents(trans), new ActionRowBuilder().addComponents(motivo));
        } else if (cat === 'Apelaciones') {
            const apel = new TextInputBuilder().setCustomId('f_extra').setLabel('¿Por qué deberías ser desbaneado?:').setPlaceholder('Adjunta tus pruebas de defensa o justificaciones de peso').setStyle(TextInputStyle.Paragraph).setRequired(true);
            motivo.setLabel('Razón del Ban (Lo que dice la pantalla):');
            modal.addComponents(new ActionRowBuilder().addComponents(nick), new ActionRowBuilder().addComponents(motivo), new ActionRowBuilder().addComponents(apel));
        } else {
            modal.addComponents(new ActionRowBuilder().addComponents(nick), new ActionRowBuilder().addComponents(motivo));
        }
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
        await interaction.deferReply({ ephemeral: true });
        const tipo = interaction.customId.replace('modal_', ''), nick = interaction.fields.getTextInputValue('f_nick'), motivo = interaction.fields.getTextInputValue('f_motivo');
        let extra = null; try { extra = interaction.fields.getTextInputValue('f_extra'); } catch(e) {}

        const canal = await interaction.guild.channels.create({
            name: `ticket-${tipo}-${interaction.user.username}`.toLowerCase().replace(/\s+/g, '-'),
            type: ChannelType.GuildText,
            parent: db.tickets.categoria,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: db.tickets.rolStaff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`Soporte Activo — Categoría: ${tipo}`)
            .setDescription('Hemos recibido tus datos con éxito. Un encargado del equipo procesará tu caso a la brevedad.\n\n**Instrucciones complementarias:**\n• Si cuentas con evidencias gráficas (imágenes o videos), puedes subirlas directamente aquí.\n• Evita realizar pings innecesarios para agilizar la resolución.')
            .setColor('#007BFF').addFields({ name: 'Usuario Discord', value: `${interaction.user}`, inline: true }, { name: 'Nick en Juego', value: `\`${nick}\``, inline: true });

        if (tipo === 'Reportar' && extra) embed.addFields({ name: 'Nick del reportado', value: `\`${extra}\``, inline: true });
        if (tipo === 'Tienda' && extra) embed.addFields({ name: 'ID Transacción', value: `\`${extra}\``, inline: true });
        if (tipo === 'Apelaciones' && extra) embed.addFields({ name: 'Defensa del Jugador', value: extra, inline: false });
        
        embed.addFields({ name: 'Causa declarada', value: motivo, inline: false }).setImage(IMAGEN_SIRENMC).setTimestamp();

        const botones = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_t').setLabel('Reclamar Ticket').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('close_t').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger)
        );

        await canal.send({ content: `||${interaction.user} | <@&${db.tickets.rolStaff}>||`, embeds: [embed], components: [botones] });
        return interaction.editReply({ content: `Tu canal de soporte se encuentra listo en: ${canal}` });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'claim_t') {
            if (!interaction.member.roles.cache.has(db.tickets.rolStaff) && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: 'Acción restringida. Solo miembros autorizados del Staff pueden tomar este caso.', ephemeral: true });
            }
            const mod = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_t').setLabel(`Atendido por ${interaction.user.username}`).setStyle(ButtonStyle.Primary).setDisabled(true), 
                new ButtonBuilder().setCustomId('close_t').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger)
            );
            await interaction.message.edit({ components: [mod] });
            return interaction.reply({ content: `El moderador ${interaction.user} ha tomado el control de esta consulta.` });
        }
        if (interaction.customId === 'close_t') {
            await interaction.reply({ content: 'Finalizando soporte. El canal se destruirá de forma irreversible en 5 segundos...' });
            setTimeout(async () => { try { await interaction.channel.delete(); } catch(e){} }, 5000);
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const ch = member.guild.channels.cache.get(db.bienvenidas.canal); if (!ch) return;
    
    const embed = new EmbedBuilder()
        .setTitle('¡Te damos la bienvenida a SirenMc!')
        .setDescription(`Hola ${member.user}, qué gusto que te unas a la network.\n\nTe sugerimos leer las normas vigentes en la sección correspondiente para evitar sanciones de juego y usa \`/ip\` para ver cómo ingresar. ¡Qué te diviertas!`)
        .setColor('#007BFF')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Miembro registrado #${member.guild.memberCount}`, iconURL: member.guild.iconURL() });
        
    ch.send({ content: `¡Bienvenido a la comunidad, ${member.user}!`, embeds: [embed] });
});

client.on('guildMemberRemove', async (member) => {
    await enviarLogMod(member.guild, 'Salida de Miembro', `El usuario **${member.user.tag}** (${member.user.id}) ha abandonado el servidor de Discord.`, '#E74C3C');
});

client.on('messageDelete', async (message) => {
    if (message.author?.bot || !message.guild) return;
    const contenido = message.content || "[El mensaje no contenía texto o era un archivo embebido]";
    await enviarLogMod(message.guild, 'Mensaje Eliminado', `**Autor:** ${message.author} (${message.author.tag})\n**Canal:** ${message.channel}\n**Mensaje:** ${contenido}`, '#E74C3C');
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (oldMessage.author?.bot || oldMessage.content === newMessage.content || !oldMessage.guild) return;
    await enviarLogMod(oldMessage.guild, 'Mensaje Editado', `**Autor:** ${oldMessage.author} (${oldMessage.author.tag})\n**Canal:** ${oldMessage.channel}\n\n**Contenido Original:**\n${oldMessage.content}\n\n**Contenido Nuevo:**\n${newMessage.content}`, '#3498DB');
});

client.on('guildMemberUpdate', (oldM, newM) => {
    if (!db.boosts.canal) return;
    const ch = oldM.guild.channels.cache.get(db.boosts.canal); if (!ch) return;

    if (!oldM.premiumSince && newM.premiumSince) {
        const boosts = newM.guild.premiumSubscriptionCount || 0;
        const embed = new EmbedBuilder()
            .setTitle('¡SirenMc ha recibido una mejora!')
            .setDescription(`Muchísimas gracias a ${newM.user} por activar un Nitro Boost.\n\nTu apoyo directo nos permite seguir expandiendo los recursos y estabilidad de la network. Comunícate con el soporte in-game para tus beneficios cosméticos.`)
            .setColor('#00C3FF')
            .setThumbnail(newM.user.displayAvatarURL({ dynamic: true }));
            
        ch.send({ content: `¡Gracias por el boost! (Tenemos actualmente ${boosts} boosts) <@1449933432695033947>!`, embeds: [embed] });
    }
});

client.login(config.TOKEN);
