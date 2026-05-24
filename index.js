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
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = {
    TOKEN: process.env.TOKEN,
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

client.once('ready', () => {
    console.log(`SirenMc Bot activo como: ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });
});

// --- SISTEMA DE COMANDOS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. Comando Help (Público)
    if (command === 'help') {
        const embedHelp = new EmbedBuilder()
            .setTitle('Manual de Comandos — SirenMc Network')
            .setDescription('Lista de comandos disponibles para todos los usuarios dentro de nuestra plataforma de Discord.')
            .setColor('#007BFF')
            .addFields(
                { name: '`!help`', value: 'Muestra este panel informativo con los comandos básicos del servidor.', inline: false },
                { name: '`!ip`', value: 'Proporciona los datos de conexión necesarios para ingresar a la Network (Java y Bedrock).', inline: false }
            )
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network' });

        return message.reply({ embeds: [embedHelp] });
    }

    // 2. Comando HelpAdmin (Exclusivo Administradores)
    if (command === 'helpadmin') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('No tienes permisos suficientes para ejecutar este comando corporativo.');
        }

        const embedHelpAdmin = new EmbedBuilder()
            .setTitle('Panel de Administración — SirenMc Bot')
            .setDescription('Guía técnica de comandos exclusivos para personal con rango de Administrador. Estos comandos configuran el comportamiento interno del bot.')
            .setColor('#0056b3')
            .addFields(
                { name: '`!helpadmin`', value: 'Muestra este menú de configuración avanzada.', inline: false },
                { name: '`!tickets <#canal> <ID_Categoría> <@RolStaff>`', value: 'Instala el panel interactivo de soporte en el canal seleccionado y vincula la categoría de destino junto al rol encargado de la moderación.', inline: false },
                { name: '`!setcanal bienvenidas <#canal>`', value: 'Establece el canal donde se enviarán las alertas de nuevos usuarios.', inline: false },
                { name: '`!setcanal boosts <#canal>`', value: 'Establece el canal asignado para las notificaciones automáticas de Nitro Boosts.', inline: false },
                { name: '`!testbienvenida`', value: 'Realiza una simulación forzada del evento de entrada de usuarios para verificar el diseño visual.', inline: false },
                { name: '`!testboost`', value: 'Realiza una simulación del sistema de alertas decorativas de Nitro Boost.', inline: false }
            )
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network • Gestión Interna' });

        return message.reply({ embeds: [embedHelpAdmin] });
    }

    // 3. Comandos de Configuración de Canales
    if (command === 'setcanal') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const tipo = args[0]?.toLowerCase();
        const canal = message.mentions.channels.first();

        if (!tipo || !canal || (tipo !== 'bienvenidas' && tipo !== 'boosts')) {
            return message.reply('Uso del comando: !setcanal [bienvenidas/boosts] #canal');
        }

        db[tipo].canal = canal.id;
        saveDB();
        return message.reply(`El canal de ${tipo} se asignó correctamente a ${canal}.`);
    }

    // 4. Configuración del Sistema de Tickets
    if (command === 'tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const canalPanel = message.mentions.channels.first();
        const categoriaId = args[1];
        const rolStaff = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

        if (!canalPanel || !categoriaId || !rolStaff) {
            return message.reply('Uso del comando:\n`!tickets <#canal-del-panel> <ID-de-la-categoria> <@RolStaff>`');
        }

        db.tickets.canal = canalPanel.id;
        db.tickets.categoria = categoriaId;
        db.tickets.rolStaff = rolStaff.id;
        saveDB();

        const embedTickets = new EmbedBuilder()
            .setTitle('Tickets SirenMc')
            .setDescription('Bienvenido al centro de asistencia oficial de SirenMc Network. Si necesitas ayuda, reportar un problema o realizar una consulta, despliega el menú de abajo para abrir un canal privado con nuestro equipo administrativo.\n\nPor favor, abre un solo ticket y aporta toda la información relevante de tu caso para darte una solución rápida.')
            .setColor('#007BFF')
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network', iconURL: message.guild.iconURL() });

        const menuSeleccion = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tickets')
                .setPlaceholder('Selecciona una categoría de soporte...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setDescription('Dudas institucionales o problemas comunes.'),
                    new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setDescription('Problemas de rendimiento o fallos de conexión.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setDescription('Denuncia a usuarios que incumplan las normas.'),
                    new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setDescription('Consultas sobre compras en nuestro sitio web.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportes al Staff').setValue('Reportes').setDescription('Quejas fundamentadas sobre un miembro del equipo.'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setDescription('Errores dentro de nuestras modalidades.'),
                    new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setDescription('Casos de pérdidas por fallos internos del servidor.'),
                    new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setDescription('Presenta tu caso si consideras que tu sanción fue injusta.')
                )
        );

        await canalPanel.send({ embeds: [embedTickets], components: [menuSeleccion] });
        return message.reply(`Panel de soporte desplegado en el canal ${canalPanel}`);
    }

    // 5. Comando IP
    if (command === 'ip') {
        const embedIp = new EmbedBuilder()
            .setTitle('Conexión SirenMc')
            .setColor('#00C3FF')
            .setDescription('Usa los siguientes datos para conectarte a nuestra red desde cualquier plataforma.')
            .addFields(
                { name: 'Dirección IP Principal (Java)', value: '`play.sirenmc.net`', inline: false },
                { name: 'Puerto Oficial (Bedrock)', value: '`19132`', inline: true },
                { name: 'Tienda Oficial', value: '[tienda.sirenmc.net](https://tienda.sirenmc.net)', inline: true }
            )
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network' });
        return message.reply({ embeds: [embedIp] });
    }

    // 6. Comandos de Prueba (Simulación)
    if (command === 'testbienvenida') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        client.emit('guildMemberAdd', message.member);
        return message.reply('Simulación de bienvenida enviada.');
    }

    if (command === 'testboost') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const viejoMiembro = { ...message.member, premiumSince: null };
        const nuevoMiembro = { ...message.member, premiumSince: new Date() };
        client.emit('guildMemberUpdate', viejoMiembro, nuevoMiembro);
        return message.reply('Simulación de Nitro Boost enviada.');
    }
});

// --- PROCESAMIENTO DE INTERACCIONES Y COMPONENTES ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const categoriaElegida = interaction.values[0];

        if (!db.tickets.categoria || !db.tickets.rolStaff) {
            return interaction.reply({ content: 'El sistema de soporte no está configurado de manera correcta.', ephemeral: true });
        }

        const sufijoUsuario = interaction.user.username.toLowerCase();
        const yaTieneTicket = interaction.guild.channels.cache.find(canal => 
            canal.parentId === db.tickets.categoria && 
            canal.name.includes(sufijoUsuario)
        );

        if (yaTieneTicket) {
            return interaction.reply({ content: `Ya tienes un canal de asistencia activo dentro del servidor. Dirígete a ${yaTieneTicket} para continuar con tu consulta.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_ticket_${categoriaElegida}`)
            .setTitle(`Formulario: ${categoriaElegida}`);

        const inputIgn = new TextInputBuilder()
            .setCustomId('ticket_ign')
            .setLabel('IGN (Tu Nick de Minecraft)')
            .setPlaceholder('Introduce tu nick exacto en el juego')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const inputMotivo = new TextInputBuilder()
            .setCustomId('ticket_motivo')
            .setLabel('Motivo de tu consulta')
            .setPlaceholder('Explica detalladamente la situación para darte una respuesta clara.')
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
            .setTitle(`Tickets SirenMc — Soporte Activo`)
            .setDescription('El equipo administrativo ha sido notificado. Por favor, mantén la paciencia y evita etiquetar innecesariamente al Staff. Puedes aportar capturas o pruebas adicionales en este chat mientras esperas.')
            .setColor('#007BFF')
            .addFields(
                { name: 'Usuario', value: `${interaction.user}`, inline: true },
                { name: 'IGN', value: `\`${ign}\``, inline: true },
                { name: 'Motivo', value: motivo, inline: false }
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

        return interaction.editReply({ content: `Canal de soporte generado con éxito. Ingresa en: ${ticketChannel}` });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'reclamar_ticket') {
            const esStaff = interaction.member.roles.cache.has(db.tickets.rolStaff) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!esStaff) {
                return interaction.reply({ content: 'Solo los miembros del equipo de soporte pueden reclamar este ticket.', ephemeral: true });
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
            return interaction.reply({ content: `El miembro del Staff ${interaction.user} se encargará del seguimiento de este caso.` });
        }

        if (interaction.customId === 'cerrar_ticket') {
            await interaction.reply({ content: 'El canal de asistencia se cerrará definitivamente en 5 segundos.' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch(e){}
            }, 5000);
        }
    }
});

// --- EVENTOS AUTOMÁTICOS ---
client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const channel = member.guild.channels.cache.get(db.bienvenidas.canal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('Bienvenido a SirenMc Network')
        .setDescription(`Hola ${member}, te damos la bienvenida a nuestra comunidad oficial en Discord.\n\nTe recomendamos revisar las normativas de convivencia generales para evitar cualquier inconveniente dentro de nuestras modalidades de juego.`)
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
            .setDescription(`Queremos agradecer enormemente a ${newMember} por mejorar el servidor usando su Nitro Boost.\n\ Tu apoyo nos permite expandir las características de la red. Tus recompensas estéticas de donador ya se encuentran asignadas en la Network.`)
            .setColor('#00C3FF')
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));

        channel.send({ content: `Gracias por el soporte, ${newMember}!`, embeds: [embed] });
    }
});

client.login(config.TOKEN);
            
