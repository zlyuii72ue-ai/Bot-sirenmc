const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    ChannelType,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID // Asegúrate de colocar el ID de tu bot en las variables de Railway
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// Imagen exclusiva para el sistema de soporte
const IMAGEN_SIRENMC = "https://cdn.discordapp.com/attachments/1498839434647441478/1508063329845776455/Screenshot_20260524-050445.Google.png?ex=6a142cec&is=6a12db6c&hm=d982b9f4852e2e8c4a4307e68c3f90426cd66f69e6bb34a5f83a249f9895853c&";

const dbPath = path.join(__dirname, 'database.json');
let db = {
    tickets: { canal: null, categoria: null, rolStaff: null },
    bienvenidas: { canal: null },
    boosts: { canal: null }
};

if (fs.existsSync(dbPath)) {
    try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch (e) { console.log("Cargando base de datos..."); }
}
const saveDB = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

// --- REGISTRO OFICIAL DE SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra el manual de comandos públicos de la Network.'),
    
    new SlashCommandBuilder()
        .setName('helpadmin')
        .setDescription('Muestra los comandos de configuración para el equipo de administración.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ip')
        .setDescription('Muestra las direcciones de conexión oficial para Java y Bedrock.'),

    new SlashCommandBuilder()
        .setName('setcanal')
        .setDescription('Asigna los canales automáticos del servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('tipo').setDescription('Selecciona el módulo').setRequired(true)
            .addChoices(
                { name: 'Bienvenidas', value: 'bienvenidas' },
                { name: 'Boosts', value: 'boosts' }
            ))
        .addChannelOption(option => option.setName('canal').setDescription('Canal de destino').setRequired(true)),

    new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Despliega e instala el panel interactivo de soporte técnico.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => option.setName('canal_panel').setDescription('Canal donde se enviará el menú').setRequired(true))
        .addChannelOption(option => option.setName('categoria').setDescription('Categoría donde se abrirán los tickets').setRequired(true))
        .addRoleOption(option => option.setName('rol_staff').setDescription('Rol de soporte encargado de responder').setRequired(true)),

    new SlashCommandBuilder()
        .setName('testbienvenida')
        .setDescription('Ejecuta una prueba de la tarjeta de bienvenida.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('testboost')
        .setDescription('Ejecuta una simulación del aviso corporativo de Nitro Boost.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`SirenMc Bot activo como: ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });

    // Publicación global de los comandos en la API de Discord
    const rest = new REST({ version: '10' }).setToken(config.TOKEN);
    try {
        console.log('Actualizando los comandos de la aplicación (/) en Discord...');
        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log('Comandos registrados globalmente de forma correcta.');
    } catch (error) {
        console.error('Error al registrar los comandos:', error);
    }
});

// --- MANEJO DE INTERACCIONES DE COMANDOS (/) ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'help') {
        const embedHelp = new EmbedBuilder()
            .setTitle('Manual de Comandos — SirenMc Network')
            .setDescription('A continuación se detallan las herramientas públicas habilitadas dentro de nuestra plataforma de comunicación para resolver inquietudes inmediatas de los usuarios.\n\n• `/help` - Despliega esta misma guía explicativa de funciones básicas.\n• `/ip` - Suministra las credenciales técnicas, direcciones IP y puertos oficiales para el ingreso inmediato a nuestra red de Minecraft.')
            .setColor('#007BFF')
            .setFooter({ text: 'SirenMc Network' });

        return interaction.reply({ embeds: [embedHelp] });
    }

    if (commandName === 'helpadmin') {
        const embedHelpAdmin = new EmbedBuilder()
            .setTitle('Panel de Administración — SirenMc Bot')
            .setDescription('Guía avanzada de operaciones automatizadas e infraestructura exclusiva para perfiles con rango de Administrador. Estos procesos alteran el comportamiento directo del bot.\n\n• `/helpadmin` - Muestra esta interfaz técnica de configuración.\n• `/tickets` - Genera de manera automatizada el sistema interactivo de soporte en el canal deseado.\n• `/setcanal` - Vincula los canales de texto del servidor para la recepción de registros dinámicos.\n• `/testbienvenida` - Fuerza el evento de entrada para validar el formato estético.\n• `/testboost` - Simula el protocolo de agradecimiento de Nitro Boost.')
            .setColor('#0056b3')
            .setFooter({ text: 'SirenMc Network • Gestión Interna' });

        return interaction.reply({ embeds: [embedHelpAdmin] });
    }

    if (commandName === 'setcanal') {
        const tipo = options.getString('tipo');
        const canal = options.getChannel('canal');

        db[tipo].canal = canal.id;
        saveDB();
        return interaction.reply({ content: `El canal asignado al flujo de **${tipo}** se ha establecido correctamente en ${canal}.`, ephemeral: true });
    }

    if (commandName === 'tickets') {
        const canalPanel = options.getChannel('canal_panel');
        const categoria = options.getChannel('categoria');
        const rolStaff = options.getRole('rol_staff');

        db.tickets.canal = canalPanel.id;
        db.tickets.categoria = categoria.id;
        db.tickets.rolStaff = rolStaff.id;
        saveDB();

        const embedTickets = new EmbedBuilder()
            .setTitle('Tickets SirenMc')
            .setDescription('# Tickets SirenMc\n\nBienvenido a la central de soporte y asistencia al usuario de SirenMc Network. Si has experimentado problemas con tu cuenta, pérdidas de inventario por fallos técnicos, anomalías en la tienda, o deseas reportar conductas que quebranten nuestra normativa interna, este es el medio adecuado para reportarlo.\n\n**Términos del Servicio de Asistencia:**\n• Mantén una conducta formal, madura y explicativa dentro del chat privado.\n• No abras múltiples canales para tratar el mismo caso; esto satura al equipo de desarrollo.\n• Aporta todos los datos precisos de forma inmediata para agilizar el proceso.')
            .setColor('#007BFF')
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network', iconURL: interaction.guild.iconURL() });

        const menuSeleccion = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tickets')
                .setPlaceholder('Despliega este menú para seleccionar una categoría de ayuda...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setDescription('Consultas generales sobre el funcionamiento de la red o rangos.'),
                    new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setDescription('Problemas graves de conexión, congelamientos de interfaz o fallas de ingreso.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setDescription('Denuncias fundamentadas con pruebas sobre tramposos o toxicidad extrema.'),
                    new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setDescription('Inconvenientes o demoras en la entrega de paquetes económicos adquiridos.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportes al Staff').setValue('Reportes').setDescription('Apelaciones o reclamaciones fundamentadas sobre el accionar de un moderador.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setDescription('Notificación de errores dentro de las modalidades que puedan romper la economía.'),
                    new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setDescription('Revisiones de inventario por decesos derivados de fallos directos de la máquina.'),
                    new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setDescription('Proceso formal de defensa en caso de considerar tu baneo un error administrativo.')
                )
        );

        await canalPanel.send({ embeds: [embedTickets], components: [menuSeleccion] });
        return interaction.reply({ content: `El sistema interactivo se ha instalado de forma exitosa en ${canalPanel}.`, ephemeral: true });
    }

    if (commandName === 'ip') {
        const embedIp = new EmbedBuilder()
            .setTitle('Conexión SirenMc')
            .setColor('#00C3FF')
            .setDescription('A continuación se exponen las credenciales obligatorias para ingresar de manera directa a nuestro servidor multiplataforma de Minecraft.\n\n• **Dirección de Dominio Principal (Java):** `play.sirenmc.net` (Versiones estables actuales).\n• **Dirección de Acceso Móvil / Consolas (Bedrock):** `play.sirenmc.net` utilizando el **Puerto Oficial:** `19132`.\n• **Portal de Compras e Inversiones:** Accede a todos los paquetes desde [tienda.sirenmc.net](https://tienda.sirenmc.net).')
            .setFooter({ text: 'SirenMc Network' });
        return interaction.reply({ embeds: [embedIp] });
    }

    if (commandName === 'testbienvenida') {
        client.emit('guildMemberAdd', interaction.member);
        return interaction.reply({ content: 'Simulación del evento de entrada enviada al canal asignado.', ephemeral: true });
    }

    if (commandName === 'testboost') {
        const viejoMiembro = { ...interaction.member, premiumSince: null };
        const nuevoMiembro = { ...interaction.member, premiumSince: new Date() };
        client.emit('guildMemberUpdate', viejoMiembro, nuevoMiembro);
        return interaction.reply({ content: 'Simulación del protocolo de Nitro Boost enviada al canal asignado.', ephemeral: true });
    }
});

// --- INTERACCIONES DE COMPONENTES INTERNOS ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const categoriaElegida = interaction.values[0];

        if (!db.tickets.categoria || !db.tickets.rolStaff) {
            return interaction.reply({ content: 'El sistema de soporte técnico no posee una vinculación de categorías válida dentro del almacenamiento.', ephemeral: true });
        }

        const sufijoUsuario = interaction.user.username.toLowerCase();
        const yaTieneTicket = interaction.guild.channels.cache.find(canal => 
            canal.parentId === db.tickets.categoria && 
            canal.name.includes(sufijoUsuario)
        );

        if (yaTieneTicket) {
            return interaction.reply({ content: `Atención: Ya mantienes un canal de atención abierto bajo tu nombre en los registros del servidor. Por favor, dirígete de inmediato a ${yaTieneTicket} para ser atendido.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_ticket_${categoriaElegida}`)
            .setTitle(`Formulario de Datos: ${categoriaElegida}`);

        const inputIgn = new TextInputBuilder()
            .setCustomId('ticket_ign')
            .setLabel('IGN (Tu Nombre dentro de Minecraft)')
            .setPlaceholder('Introduce tu nick exacto respetando mayúsculas')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const inputMotivo = new TextInputBuilder()
            .setCustomId('ticket_motivo')
            .setLabel('Descripción detallada del problema')
            .setPlaceholder('Explica minuciosamente los acontecimientos puntuales para brindarte una solución eficaz.')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputIgn),
            new ActionRowBuilder().addComponents(inputMotivo)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
        await interaction.deferReply({ ephemeral: true });

        const tipoTicket = interaction.customId.replace('modal_ticket_', '');
        const ign = interaction.fields.getTextInputValue('ticket_ign');
        const motivo = interaction.fields.getTextInputValue('ticket_motivo');

        const nombreCanal = `ticket-${tipoTicket}-${interaction.user.username}`.toLowerCase().replace(/\s+/g, '-');

        const ticketChannel = await interaction.guild.channels.create({
            name: nombreCanal,
            type: ChannelType.GuildText,
            parent: db.tickets.categoria,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: db.tickets.rolStaff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ],
        });

        const embedTicketInterno = new EmbedBuilder()
            .setTitle('Tickets SirenMc — Soporte Activo')
            .setDescription('# Tickets SirenMc\n\nTu requerimiento ha sido clasificado y enviado a las terminales del equipo técnico de la Network. Un desarrollador o moderador calificado procederá a la inspección minuciosa de tu caso.\n\n**Recomendaciones de Seguridad:**\n• Adjunta en este chat capturas de pantalla, archivos de registro, coordenadas exactas o recibos de transacción de inmediato.\n• Queda estrictamente prohibido etiquetar de forma masiva al equipo Staff; aguarda pacientemente tu turno.')
            .setColor('#007BFF')
            .addFields(
                { name: 'Usuario de Discord', value: `${interaction.user}`, inline: true },
                { name: 'Nick en Servidor (IGN)', value: `\`${ign}\` `, inline: true },
                { name: 'Detalles del Caso', value: motivo, inline: false }
            )
            .setImage(IMAGEN_SIRENMC)
            .setTimestamp();

        const filaBotones = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('reclamar_ticket')
                .setLabel('Reclamar Ticket')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('cerrar_ticket')
                .setLabel('Cerrar Ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ 
            content: `||${interaction.user} | <@&${db.tickets.rolStaff}>||`, 
            embeds: [embedTicketInterno], 
            components: [filaBotones] 
        });

        return interaction.editReply({ content: `Canal de asistencia establecido correctamente de forma privada. Dirígete a: ${ticketChannel}` });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'reclamar_ticket') {
            const esStaff = interaction.member.roles.cache.has(db.tickets.rolStaff) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!esStaff) {
                return interaction.reply({ content: 'No posees los rangos jerárquicos o credenciales administrativas requeridas para tomar control de este caso.', ephemeral: true });
            }

            const filaModificada = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reclamar_ticket')
                    .setLabel(`Atendido por ${interaction.user.username}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('cerrar_ticket')
                    .setLabel('Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.message.edit({ components: [filaModificada] });
            return interaction.reply({ content: `El miembro de la administración ${interaction.user} ha tomado el caso de forma oficial y gestionará su resolución.` });
        }

        if (interaction.customId === 'cerrar_ticket') {
            await interaction.reply({ content: 'Iniciando el protocolo de clausura y archivado del canal. Remoción completa de datos en 5 segundos.' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch(e){}
            }, 5000);
        }
    }
});

// --- PROCESAMIENTO DE REGISTROS LOGÍSTICOS ---
client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const channel = member.guild.channels.cache.get(db.bienvenidas.canal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('Bienvenido a SirenMc Network')
        .setDescription(`Hola ${member}, te damos una grata bienvenida a nuestro servidor oficial de comunicación de Discord. Nos complace que formes parte de nuestra comunidad en expansión. Te sugerimos encarecidamente revisar detalladamente los canales institucionales y reglamentos internos para mantener una convivencia armónica dentro de las diversas modalidades de juego que ofrecemos de manera pública.`)
        .setColor('#007BFF')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Miembro registrado #${member.guild.memberCount}`, iconURL: member.guild.iconURL() });

    channel.send({ content: `Bienvenido/a a la Network, ${member}!`, embeds: [embed] });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (!db.boosts.canal) return;
    const channel = oldMember.guild.channels.cache.get(db.boosts.canal);
    if (!channel) return;

    if (!oldMember.premiumSince && newMember.premiumSince) {
        const embed = new EmbedBuilder()
            .setTitle('SirenMc Nitro Boost')
            .setDescription(`Queremos expresar nuestro profundo agradecimiento a ${newMember} por impulsar activamente nuestra comunidad mediante el uso de su Nitro Boost.\n\nEste valioso aporte de la comunidad ayuda de manera directa a sustentar la infraestructura física del servidor. Tus beneficios correspondientes y rangos de donador han sido habilitados de forma inmediata en la red de juego.`)
            .setColor('#00C3FF')
            .setThumbnail(newMember.user.displayAvatarURL(
