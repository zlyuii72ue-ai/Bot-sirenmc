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
    CLIENT_ID: process.env.CLIENT_ID,
    PREFIX: "!"
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

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

// --- COMANDOS (/) ---
const slashCommandsData = [
    new SlashCommandBuilder().setName('help').setDescription('Muestra los comandos para los usuarios.'),
    new SlashCommandBuilder().setName('helpadmin').setDescription('Comandos de configuración para el Staff.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('ip').setDescription('Dirección IP y puerto oficial para entrar.'),
    new SlashCommandBuilder().setName('testbienvenida').setDescription('Prueba el mensaje de bienvenida.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('testboost').setDescription('Prueba el mensaje de boost.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setcanal').setDescription('Configura los canales del bot.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('tipo').setDescription('Módulo').setRequired(true).addChoices({ name: 'Bienvenidas', value: 'bienvenidas' }, { name: 'Boosts', value: 'boosts' }))
        .addChannelOption(opt => opt.setName('canal').setDescription('Canal elegido').setRequired(true)),
    new SlashCommandBuilder().setName('tickets').setDescription('Instala el panel de tickets.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('canal_panel').setDescription('Canal del panel').setRequired(true))
        .addChannelOption(opt => opt.setName('categoria').setDescription('Categoría para los tickets').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_staff').setDescription('Rol del Staff').setRequired(true))
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
    console.log(`SirenMc Bot activo como: ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });

    if (config.CLIENT_ID) {
        const rest = new REST({ version: '10' }).setToken(config.TOKEN);
        try {
            await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: slashCommandsData });
            console.log('Comandos registrados en Discord correctamente.');
        } catch (error) { console.error('Error en Slash Commands:', error); }
    }
});

// --- COMPONENTES TEXTO (MENOS "IA", MÁS NATURALES) ---
async function ejecutarHelp() {
    const embedHelp = new EmbedBuilder()
        .setTitle('Comandos de SirenMc')
        .setDescription('Aquí tienes los comandos que puedes usar en este canal:\n\n• `help` - Muestra esta lista con la información básica.\n• `ip` - Te da la IP y el puerto para entrar al servidor desde Java o Bedrock.')
        .setColor('#007BFF')
        .setFooter({ text: 'SirenMc Network' });
    return { embeds: [embedHelp] };
}

async function ejecutarHelpAdmin() {
    const embedHelpAdmin = new EmbedBuilder()
        .setTitle('Panel de Control Administrativo')
        .setDescription('Comandos internos para la gestión del bot:\n\n• `helpadmin` - Despliega esta lista de ayuda.\n• `tickets` - Configura y monta el panel de soporte.\n• `setcanal` - Vincula canales para el envío de logs (bienvenidas/boosts).\n• `testbienvenida` - Simula la entrada de un usuario.\n• `testboost` - Simula un Nitro Boost.')
        .setColor('#0056b3')
        .setFooter({ text: 'SirenMc Network • Staff' });
    return { embeds: [embedHelpAdmin] };
}

async function ejecutarIp() {
    const embedIp = new EmbedBuilder()
        .setTitle('¿Cómo conectar a SirenMc?')
        .setColor('#00C3FF')
        .setDescription('Usa estos datos para conectarte al servidor:\n\n• **IP Principal (Java):** `play.sirenmc.net` \n• **IP / Puerto (Bedrock):** IP: `play.sirenmc.net` | Puerto: `19132`\n• **Tienda Oficial:** [tienda.sirenmc.net](https://tienda.sirenmc.net)')
        .setFooter({ text: 'SirenMc Network' });
    return { embeds: [embedIp] };
}

async function generarPanelTickets(guild, canalPanel, categoria, rolStaff) {
    db.tickets.canal = canalPanel.id;
    db.tickets.categoria = categoria.id;
    db.tickets.rolStaff = rolStaff.id;
    saveDB();

    const embedTickets = new EmbedBuilder()
        .setTitle('Tickets SirenMc')
        .setDescription('# Tickets SirenMc\n\n¿Tienes algún problema dentro del servidor o necesitas reportar algo? Abre un ticket seleccionando la categoría que corresponda en el menú de abajo.\n\n**Reglas básicas antes de abrir uno:**\n• Explica tu problema detalladamente desde el primer mensaje.\n• No abras un ticket si no vas a responder o si solo vienes a jugar.\n• Evita taggear al Staff en el chat privado, atenderemos tu caso lo antes posible.')
        .setColor('#007BFF')
        .setImage(IMAGEN_SIRENMC)
        .setFooter({ text: 'SirenMc Network', iconURL: guild.iconURL() });

    const menuSeleccion = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('menu_tickets')
            .setPlaceholder('Selecciona la categoría de tu problema...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setDescription('Dudas generales sobre modalidades, rangos o el Discord.'),
                new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setDescription('Problemas de conexión, lag extremo o bugs de entrada.'),
                new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setDescription('Reporta a usuarios usando hacks, insultando o haciendo dupeo.'),
                new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setDescription('Si compraste algo en la tienda y aún no te llega en el juego.'),
                new StringSelectMenuOptionBuilder().setLabel('Reportes al Staff').setValue('Reportes').setDescription('Quejas fundamentadas sobre un miembro del equipo Staff.'),
                new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setDescription('Errores internos del juego que afecten la jugabilidad.'),
                new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setDescription('Petición de revive por muerte debido a fallos o caídas del servidor.'),
                new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setDescription('Si crees que tu baneo o baneo de IP fue injusto.')
            )
    );

    await canalPanel.send({ embeds: [embedTickets], components: [menuSeleccion] });
}

// --- COMANDOS POR TEXTO (!) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'help') return message.reply(await ejecutarHelp());
    if (command === 'ip') return message.reply(await ejecutarIp());

    if (command === 'helpadmin') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('No tienes permisos.');
        return message.reply(await ejecutarHelpAdmin());
    }

    if (command === 'setcanal') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const tipo = args[0]?.toLowerCase();
        const canal = message.mentions.channels.first();

        if (!tipo || !canal || (tipo !== 'bienvenidas' && tipo !== 'boosts')) {
            return message.reply('Uso: `!setcanal [bienvenidas/boosts] #canal`');
        }

        db[tipo].canal = canal.id;
        saveDB();
        return message.reply(`Canal de **${tipo}** guardado en ${canal}.`);
    }

    if (command === 'tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const canalPanel = message.mentions.channels.first();
        const categoriaId = args[1];
        const rolStaff = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
        const categoriaCanal = message.guild.channels.cache.get(categoriaId);

        if (!canalPanel || !categoriaCanal || !rolStaff) {
            return message.reply('Uso: `!tickets <#canal-panel> <ID-categoria> <@RolStaff>`');
        }

        await generarPanelTickets(message.guild, canalPanel, categoriaCanal, rolStaff);
        return message.reply(`Panel de tickets instalado en ${canalPanel}.`);
    }

    if (command === 'testbienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        client.emit('guildMemberAdd', message.member);
        return message.reply('Simulación enviada.');
    }

    if (command === 'testboost') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const viejoMiembro = { ...message.member, premiumSince: null };
        const nuevoMiembro = { ...message.member, premiumSince: new Date() };
        client.emit('guildMemberUpdate', viejoMiembro, nuevoMiembro);
        return message.reply('Simulación enviada.');
    }
});

// --- INTERACCIONES Y FORMULARIOS PERSONALIZADOS ---
client.on('interactionCreate', async (interaction) => {
    // 1. Slash Commands (/)
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'help') return interaction.reply(await ejecutarHelp());
        if (commandName === 'ip') return interaction.reply(await ejecutarIp());
        if (commandName === 'helpadmin') return interaction.reply(await ejecutarHelpAdmin());

        if (commandName === 'setcanal') {
            const tipo = options.getString('tipo');
            const canal = options.getChannel('canal');
            db[tipo].canal = canal.id;
            saveDB();
            return interaction.reply({ content: `Canal de **${tipo}** configurado en ${canal}.`, ephemeral: true });
        }

        if (commandName === 'tickets') {
            const canalPanel = options.getChannel('canal_panel');
            const categoria = options.getChannel('categoria');
            const rolStaff = options.getRole('rol_staff');
            await generarPanelTickets(interaction.guild, canalPanel, categoria, rolStaff);
            return interaction.reply({ content: 'Panel de tickets instalado.', ephemeral: true });
        }

        if (commandName === 'testbienvenida') {
            client.emit('guildMemberAdd', interaction.member);
            return interaction.reply({ content: 'Simulación enviada.', ephemeral: true });
        }

        if (commandName === 'testboost') {
            const viejoMiembro = { ...interaction.member, premiumSince: null };
            const nuevoMiembro = { ...interaction.member, premiumSince: new Date() };
            client.emit('guildMemberUpdate', viejoMiembro, nuevoMiembro);
            return interaction.reply({ content: 'Simulación enviada.', ephemeral: true });
        }
    }

    // 2. Selección de Categoría de Ticket (Crea las preguntas dinámicas)
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const cat = interaction.values[0];

        if (!db.tickets.categoria || !db.tickets.rolStaff) {
            return interaction.reply({ content: 'El sistema no está configurado correctamente todavía.', ephemeral: true });
        }

        const sufijoUsuario = interaction.user.username.toLowerCase();
        const yaTieneTicket = interaction.guild.channels.cache.find(canal => 
            canal.parentId === db.tickets.categoria && canal.name.includes(sufijoUsuario)
        );

        if (yaTieneTicket) {
            return interaction.reply({ content: `Ya tienes un ticket abierto actualmente en ${yaTieneTicket}. Cierra ese antes de abrir uno nuevo.`, ephemeral: true });
        }

        const modal = new ModalBuilder().setCustomId(`modal_ticket_${cat}`).setTitle(`Ticket: ${cat}`);

        // Campos base universales
        const campoNick = new TextInputBuilder().setCustomId('f_nick').setLabel('Tu Nick de Minecraft:').setPlaceholder('Escribe tu nombre exacto en el juego').setStyle(TextInputStyle.Short).setRequired(true);
        const campoMotivo = new TextInputBuilder().setCustomId('f_motivo').setLabel('Motivo o explicación:').setPlaceholder('Explica qué sucedió de la forma más detallada posible').setStyle(TextInputStyle.Paragraph).setRequired(true);

        // Campos dinámicos según el tipo seleccionado
        if (cat === 'Revives') {
            campoMotivo.setLabel('¿Cómo moriste? (Detalla el bug):');
            modal.addComponents(new ActionRowBuilder().addComponents(campoNick), new ActionRowBuilder().addComponents(campoMotivo));
        } 
        else if (cat === 'Reportar') {
            const campoReportado = new TextInputBuilder().setCustomId('f_extra').setLabel('Nick del usuario reportado:').setPlaceholder('¿A quién estás reportando?').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(campoNick), new ActionRowBuilder().addComponents(campoReportado), new ActionRowBuilder().addComponents(campoMotivo));
        } 
        else if (cat === 'Tienda') {
            const campoTransaccion = new TextInputBuilder().setCustomId('f_extra').setLabel('ID de Transacción / ID de factura:').setPlaceholder('Pega el ID de compra enviado a tu correo electrónico.').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(campoNick), new ActionRowBuilder().addComponents(campoTransaccion), new ActionRowBuilder().addComponents(campoMotivo));
        }
        else if (cat === 'Apelaciones') {
            const campoRazon = new TextInputBuilder().setCustomId('f_extra').setLabel('¿Por qué deberías ser desbaneado?:').setPlaceholder('Indica tus razones o pruebas de defensa legítimas.').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(campoNick), new ActionRowBuilder().addComponents(campoMotivo).setComponents(new TextInputBuilder().setCustomId('f_motivo').setLabel('Razón de tu ban (lo que ponía al salir):').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(campoRazon));
        }
        else {
            // Soporte General, Ayuda, Reportes, Bugs usan el formato estándar
            modal.addComponents(new ActionRowBuilder().addComponents(campoNick), new ActionRowBuilder().addComponents(campoMotivo));
        }

        await interaction.showModal(modal);
    }

    // 3. Envío del Formulario (Creación Física del canal de soporte)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
        await interaction.deferReply({ ephemeral: true });

        const tipoTicket = interaction.customId.replace('modal_ticket_', '');
        const nick = interaction.fields.getTextInputValue('f_nick');
        const motivo = interaction.fields.getTextInputValue('f_motivo');
        
        let infoExtra = null;
        try { infoExtra = interaction.fields.getTextInputValue('f_extra'); } catch(e) {}

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
            .setDescription('# Tickets SirenMc\n\nTu ticket ha sido creado correctamente. El Staff encargado revisará los datos proporcionados.\n\n**¿Qué debes hacer ahora?**\n• Si tienes pruebas en video, imágenes o logs de Minecraft, ve subiéndolos en este chat de inmediato.\n• Espera a que un administrador responda, no hagas spam de pings.')
            .setColor('#007BFF')
            .addFields(
                { name: 'Usuario Discord', value: `${interaction.user}`, inline: true },
                { name: 'Nick en Juego', value: `\`${nick}\``, inline: true }
            );

        // Agrega el campo extra en el embed según el formulario que se llenó
        if (tipoTicket === 'Reportar' && infoExtra) embedTicketInterno.addFields({ name: 'Usuario Reportado', value: `\`${infoExtra}\``, inline: true });
        if (tipoTicket === 'Tienda' && infoExtra) embedTicketInterno.addFields({ name: 'ID Transacción', value: `\`${infoExtra}\``, inline: true });
        
        embedTicketInterno.addFields({ name: 'Explicación del Caso', value: motivo, inline: false });
        embedTicketInterno.setImage(IMAGEN_SIRENMC).setTimestamp();

        const filaBotones = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('reclamar_ticket').setLabel('Reclamar Ticket').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ 
            content: `||${interaction.user} | <@&${db.tickets.rolStaff}>||`, 
            embeds: [embedTicketInterno], 
            components: [filaBotones] 
        });

        return interaction.editReply({ content: `Tu canal de soporte ha sido creado en: ${ticketChannel}` });
    }

    // 4. Gestión de Botones dentro de los Tickets (Reclamar / Cerrar)
    if (interaction.isButton()) {
        if (interaction.customId === 'reclamar_ticket') {
            const esStaff = interaction.member.roles.cache.has(db.tickets.rolStaff) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!esStaff) return interaction.reply({ content: 'No tienes permisos para reclamar tickets.', ephemeral: true });

            const filaModificada = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reclamar_ticket').setLabel(`Atendido por ${interaction.user.username}`).setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger)
            );

            await interaction.message.edit({ components: [filaModificada] });
            return interaction.reply({ content: `El administrador ${interaction.user} se encargará de resolver este ticket.` });
        }

        if (interaction.customId === 'cerrar_ticket') {
            await interaction.reply({ content: 'Este canal se cerrará permanentemente en 5 segundos...' });
            setTimeout(async () => { try { await interaction.channel.delete(); } catch(e){} }, 5000);
        }
    }
});

// --- ENTRADAS AUTOMÁTICAS (BIENVENIDAS Y BOOSTS) ---
client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const channel = member.guild.channels.cache.get(db.bienvenidas.canal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('¡Bienvenido/a a SirenMc Network!')
        .setDescription(`Hola ${member}, qué bueno tenerte por aquí.\n\nRecuerda revisar las reglas del servidor para evitar inconvenientes y pásate por el canal de IP si necesitas los datos para conectarte a las modalidades. ¡Diviértete!`)
        .setColor('#007BFF')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Eres el miembro número #${member.guild.memberCount}`, iconURL: member.guild.iconURL() });

    channel.send({ content: `¡Bienvenido/a a la comunidad, ${member}!`, embeds: [embed] });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (!db.boosts.canal) return;
    const channel = oldMember.guild.channels.cache.get(db.boosts.canal);
    if (!channel) return;

    // Se corrigió el bug de [object Object] usando .user para la mención de texto plano externo
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const embed = new EmbedBuilder()
            .setTitle('¡SirenMc ha recibido un Nitro Boost!')
            .setDescription(`Muchísimas gracias a ${newMember} por mejorar el servidor con su Nitro Boost.\n\nTu apoyo nos ayuda un montón a mantener activa la network. Ya tienes tus beneficios estéticos asignados en el juego.`)
            .setColor('#00C3FF')
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));

        channel.send({ content: `¡Gracias por el soporte, ${newMember.user}!`, embeds: [embed] });
    }
});

client.login(config.TOKEN);
