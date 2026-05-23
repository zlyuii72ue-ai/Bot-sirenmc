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
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Base de datos temporal en memoria
const db = {
    tickets: { canal: null, categoria: null, rolStaff: null },
    bienvenidas: { canal: null },
    boosts: { canal: null }
};

// --- REGISTRO DE COMANDOS DE BARRA (SLASH COMMANDS) ---
const commands = [
    new SlashCommandBuilder()
        .setName('bienvenidas')
        .setDescription('Configura el canal de bienvenidas de SirenMc.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => option.setName('canal').setDescription('Canal de bienvenidas').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('boosts')
        .setDescription('Configura el canal de notificaciones de Nitro Boosts.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => option.setName('canal').setDescription('Canal de boosts').setRequired(true)),

    new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Configura e instala el panel de soporte técnico.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => option.setName('canal_panel').setDescription('Canal donde se enviará el menú de tickets').setRequired(true))
        .addChannelOption(option => option.setName('categoria').setDescription('Categoría donde se abrirán los tickets').setRequired(true))
        .addRoleOption(option => option.setName('rol_staff').setDescription('Rol de soporte que gestionará los tickets').setRequired(true)),

    new SlashCommandBuilder()
        .setName('borrar')
        .setDescription('Desvincula la configuración de un módulo del servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('modulo')
            .setDescription('Módulo que deseas limpiar')
            .setRequired(true)
            .addChoices(
                { name: 'Tickets', value: 'tickets' },
                { name: 'Bienvenidas', value: 'bienvenidas' },
                { name: 'Boosts', value: 'boosts' }
            )),
    
    new SlashCommandBuilder()
        .setName('ip')
        .setDescription('Muestra la información de conexión a SirenMc.'),

    new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Reclama el ticket actual como tu responsabilidad.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('unclaim')
        .setDescription('Libera el ticket actual para que otro staff lo atienda.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Cambia el nombre del canal del ticket.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => option.setName('nombre').setDescription('Nuevo nombre para el canal').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`🧜‍♀️ SirenMc conectado correctamente como ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });

    // Registrar comandos globales
    const rest = new REST({ version: '10' }).setToken(config.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log('✅ Comandos de barra (/) cargados con éxito.');
    } catch (error) {
        console.error('❌ Error al cargar comandos:', error);
    }
});

// --- ENRUTADOR DE COMANDOS (SLASH COMMANDS) ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'bienvenidas') {
        const targetChannel = options.getChannel('canal');
        db.bienvenidas.canal = targetChannel.id;
        return interaction.reply({ content: `🔔 Módulo establecido correctamente en ${targetChannel}.`, ephemeral: true });
    }

    if (commandName === 'boosts') {
        const targetChannel = options.getChannel('canal');
        db.boosts.canal = targetChannel.id;
        return interaction.reply({ content: `💎 Alertas de Boost vinculadas al canal ${targetChannel}.`, ephemeral: true });
    }

    if (commandName === 'tickets') {
        const canalPanel = options.getChannel('canal_panel');
        db.tickets.canal = canalPanel.id;
        db.tickets.categoria = options.getChannel('categoria').id;
        db.tickets.rolStaff = options.getRole('rol_staff').id;

        const embedTickets = new EmbedBuilder()
            .setTitle('🧜‍♀️ CENTRO DE SOPORTE - SIRENMC')
            .setDescription('Bienvenido al área de atención al jugador de SirenMc.\n\nSelecciona en el menú desplegable inferior el motivo exacto de tu consulta para abrir un canal privado con nuestro equipo de soporte.')
            .setColor('#00bfff')
            .setImage('https://i.imgur.com/Tu-Imagen-De-SirenMc.png') // Reemplaza por la URL real de tu imagen
            .setFooter({ text: 'SirenMc Network • Soporte Técnico' });

        const menuSeleccion = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tickets')
                .setPlaceholder('Selecciona una categoría de asistencia...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setEmoji('🎫').setDescription('Dudas generales sobre la Network.'),
                    new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setEmoji('🛠️').setDescription('Problemas técnicos de conexión o carga.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setEmoji('🚫').setDescription('Denuncia a un usuario rompiendo reglas.'),
                    new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setEmoji('🛒').setDescription('Consultas sobre compras y rangos.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportes Staff').setValue('Reportes').setEmoji('⚖️').setDescription('Quejas o reportes de algún miembro del equipo.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setEmoji('🐛').setDescription('Errores dentro de las modalidades.'),
                    new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setEmoji('❤️').setDescription('Peticiones legítimas de reanimación.'),
                    new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setEmoji('🔓').setDescription('Apela un baneo o muteo injusto.')
                )
        );

        await canalPanel.send({ embeds: [embedTickets], components: [menuSeleccion] });
        return interaction.reply({ content: `✅ Panel de soporte desplegado en ${canalPanel}`, ephemeral: true });
    }

    if (commandName === 'borrar') {
        const modulo = options.getString('modulo');
        if (modulo === 'tickets') db.tickets = { canal: null, categoria: null, rolStaff: null };
        else db[modulo].canal = null;

        return interaction.reply({ content: `🧹 Se ha borrado y desvinculado por completo la configuración del módulo **${modulo}**.`, ephemeral: true });
    }

    if (commandName === 'ip') {
        const embedIp = new EmbedBuilder()
            .setTitle('🧜‍♀️ CONÉCTATE A SIRENMC')
            .setColor('#00ffbb')
            .addFields(
                { name: '🌐 Dirección IP (Java & Bedrock)', value: '`play.sirenmc.net`', inline: false },
                { name: '🔌 Puerto Bedrock', value: '`19132`', inline: true },
                { name: '🛒 Sitio Web / Tienda', value: '[tienda.sirenmc.net](https://tienda.sirenmc.net)', inline: true }
            )
            .setFooter({ text: 'SirenMc Network' });
        return interaction.reply({ embeds: [embedIp] });
    }

    // --- COMANDOS INTERNOS DE GESTIÓN DE TICKETS ---
    if (commandName === 'claim') {
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: '❌ Este comando solo se puede ejecutar dentro de un ticket activo.', ephemeral: true });
        }
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { SendMessages: true, ViewChannel: true });
        return interaction.reply({ content: `🔒 Este ticket ahora está siendo atendido formalmente por ${interaction.user}.` });
    }

    if (commandName === 'unclaim') {
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: '❌ Este comando solo se puede ejecutar dentro de un ticket activo.', ephemeral: true });
        }
        return interaction.reply({ content: `🔓 ${interaction.user} ha liberado el ticket. Queda disponible para el resto del Staff.` });
    }

    if (commandName === 'rename') {
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({ content: '❌ Este comando solo se puede ejecutar dentro de un ticket activo.', ephemeral: true });
        }
        const nuevoNombre = options.getString('nombre').toLowerCase().replace(/\s+/g, '-');
        await interaction.channel.setName(`ticket-${nuevoNombre}`);
        return interaction.reply({ content: `✍️ Canal renombrado correctamente a: \`ticket-${nuevoNombre}\``, ephemeral: true });
    }
});

// --- LÓGICA DE MENÚ Y FORMULARIO DE TICKETS ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const categoriaSeleccionada = interaction.values[0];

        if (!db.tickets.categoria || !db.tickets.rolStaff) {
            return interaction.reply({ content: '❌ El sistema de soporte no está configurado de manera correcta.', ephemeral: true });
        }

        // Crear formulario dinámico (Modal)
        const modal = new ModalBuilder()
            .setCustomId(`modal_ticket_${categoriaSeleccionada}`)
            .setTitle(`Formulario: ${categoriaSeleccionada}`);

        const inputIgn = new TextInputBuilder()
            .setCustomId('ticket_ign')
            .setLabel('IGN (Tu Nick de Minecraft)')
            .setPlaceholder('Ej: SirenPlayer_99')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const inputMotivo = new TextInputBuilder()
            .setCustomId('ticket_motivo')
            .setLabel('Motivo detallado de tu consulta')
            .setPlaceholder('Explica detalladamente la razón de tu ticket...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputIgn),
            new ActionRowBuilder().addComponents(inputMotivo)
        );

        await interaction.showModal(modal);
    }

    // Recepción de los datos del formulario (Modal Submit)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
        await interaction.deferReply({ ephemeral: true });
        
        const tipoTicket = interaction.customId.replace('modal_ticket_', '');
        const ign = interaction.fields.getTextInputValue('ticket_ign');
        const motivo = interaction.fields.getTextInputValue('ticket_motivo');

        const nombreCanal = `ticket-${tipoTicket}-${interaction.user.username}`;

        // Crear el canal de soporte privado
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

        const embedInterno = new EmbedBuilder()
            .setTitle(`🧜‍♀️ REGISTRO DE ASISTENCIA: ${tipoTicket.toUpperCase()}`)
            .setColor('#00ffaa')
            .addFields(
                { name: '👤 Usuario', value: `${interaction.user}`, inline: true },
                { name: '🎮 IGN', value: `\`${ign}\``, inline: true },
                { name: '📝 Motivo', value: motivo, inline: false }
            )
            .setFooter({ text: 'SirenMc Network Staff Team' })
            .setTimestamp();

        const botonCerrar = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cerrar_ticket_canal')
                .setLabel('Cerrar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({ 
            content: `||${interaction.user} | <@&${db.tickets.rolStaff}>||`, 
            embeds: [embedInterno], 
            components: [botonCerrar] 
        });

        return interaction.editReply({ content: `✅ Canal creado con éxito. Entra aquí: ${ticketChannel}` });
    }

    // Cierre manual del ticket por botón
    if (interaction.isButton() && interaction.customId === 'cerrar_ticket_canal') {
        await interaction.reply({ content: '🔒 El ticket se archivará y eliminará en 5 segundos...' });
        setTimeout(async () => {
            try { await interaction.channel.delete(); } catch(e){}
        }, 5000);
    }
});

// --- BIENVENIDAS Y BOOSTS ---
client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const channel = member.guild.channels.cache.get(db.bienvenidas.canal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🧜‍♀️ ¡Bienvenido a SirenMc Network! 🧜‍♀️')
        .setDescription(`¡Hola ${member}! Te damos la bienvenida a nuestra comunidad.\n\nRecuerda revisar los canales informativos y vincular tu cuenta para la mejor experiencia dentro de las modalidades.`)
        .setColor('#00aaff')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Miembro #${member.guild.memberCount}` })
        .setTimestamp();

    channel.send({ content: `¡Bienvenido/a ${member}!`, embeds: [embed] });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (!db.boosts.canal) return;
    const channel = oldMember.guild.channels.cache.get(db.boosts.canal);
    if (!channel) return;

    if (!oldMember.premiumSince && newMember.premiumSince) {
        const embed = new EmbedBuilder()
            .setTitle('💎 ¡SURENMC NETWORK TIENE UN NUEVO BOOST! 💎')
            .setDescription(`Muchas gracias ${newMember} por mejorar las capacidades del servidor usando tu **Nitro Boost**.\n\n¡Disfruta tus ventajas asignadas de manera inmediata! ✨`)
            .setColor('#ff73fa')
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        channel.send({ content: `🎉 ¡Gracias por el Boost, ${newMember}!`, embeds: [embed] });
    }
});

client.login(config.TOKEN);
  
