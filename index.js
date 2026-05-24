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

// URL de la imagen oficial proporcionada para SirenMc
const IMAGEN_SIRENMC = "https://cdn.discordapp.com/attachments/1498839434647441478/1508063329845776455/Screenshot_20260524-050445.Google.png?ex=6a142cec&is=6a12db6c&hm=d982b9f4852e2e8c4a4307e68c3f90426cd66f69e6bb34a5f83a249f9895853c&";

// Persistencia local para que Railway no borre los canales asignados
const dbPath = path.join(__dirname, 'database.json');
let db = {
    tickets: { canal: null, categoria: null, rolStaff: null },
    bienvenidas: { canal: null },
    boosts: { canal: null }
};

if (fs.existsSync(dbPath)) {
    try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch (e) { console.log("Iniciando almacenamiento de datos..."); }
}
const saveDB = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

client.once('ready', () => {
    console.log(`🧜‍♀️ SirenMc activo mediante cuenta: ${client.user.tag}`);
    client.user.setActivity('play.sirenmc.net', { type: 3 });
});

// --- COMANDOS BASADOS EN PREFIJO (!) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Comando !tickets (EXCLUSIVO ADMINISTRADORES)
    if (command === 'tickets') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Permisos insuficientes. Este comando requiere privilegios de **Administrador**.');
        }

        // Obtener argumentos estructurados: !tickets <#canal_panel> <ID_categoria> <@Rol_Staff>
        const canalPanel = message.mentions.channels.first();
        const categoriaId = args[1];
        const rolStaff = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

        if (!canalPanel || !categoriaId || !rolStaff) {
            return message.reply('ℹ️ **Uso correcto del comando:**\n`!tickets <#canal-donde-va-el-panel> <ID-de-la-categoria> <@RolStaff>`');
        }

        db.tickets.canal = canalPanel.id;
        db.tickets.categoria = categoriaId;
        db.tickets.rolStaff = rolStaff.id;
        saveDB();

        const embedTickets = new EmbedBuilder()
            .setTitle('🧜‍♀️ CENTRO DE SOPORTE - SIRENMC NETWORK')
            .setDescription('Bienvenido al sector de asistencia de nuestra comunidad.\n\nSi necesitas reportar a un usuario, tienes dudas sobre la tienda, o has encontrado algún fallo, despliega el menú inferior y selecciona la categoría correcta.')
            .setColor('#00bfff')
            .setImage(IMAGEN_SIRENMC)
            .setFooter({ text: 'SirenMc Network • Gestión Oficial' });

        const menuSeleccion = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_tickets')
                .setPlaceholder('Selecciona la categoría de tu consulta...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Soporte General').setValue('Soporte').setEmoji('🎫'),
                    new StringSelectMenuOptionBuilder().setLabel('Ayuda Técnica').setValue('Ayuda').setEmoji('🛠️'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Jugador').setValue('Reportar').setEmoji('🚫'),
                    new StringSelectMenuOptionBuilder().setLabel('Problemas con la Tienda').setValue('Tienda').setEmoji('🛒'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportes Staff').setValue('Reportes').setEmoji('⚖️'),
                    new StringSelectMenuOptionBuilder().setLabel('Reportar Bugs').setValue('Bugs').setEmoji('🐛'),
                    new StringSelectMenuOptionBuilder().setLabel('Solicitud de Revives').setValue('Revives').setEmoji('❤️'),
                    new StringSelectMenuOptionBuilder().setLabel('Apelaciones de Sanción').setValue('Apelaciones').setEmoji('🔓')
                )
        );

        await canalPanel.send({ embeds: [embedTickets], components: [menuSeleccion] });
        return message.reply(`✅ El panel se ha generado e instalado con éxito en ${canalPanel}`);
    }

    // Comando !ip (Público)
    if (command === 'ip') {
        const embedIp = new EmbedBuilder()
            .setTitle('突破 CONÉCTATE A SIRENMC NETWORK 突破')
            .setColor('#00ffbb')
            .addFields(
                { name: '🌐 Dirección IP Única (Java / Bedrock)', value: '`play.sirenmc.net`', inline: false },
                { name: '🔌 Puerto Oficial Bedrock', value: '`19132`', inline: true },
                { name: '🛒 Plataforma de Tienda', value: '[tienda.sirenmc.net](https://tienda.sirenmc.net)', inline: true }
            )
            .setImage(IMAGEN_SIRENMC);
        return message.reply({ embeds: [embedIp] });
    }
});

// --- ENTRADA DE CONFIGURACIÓN DE MENÚS Y COMPONENTES ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tickets') {
        const categoriaElegida = interaction.values[0];

        if (!db.tickets.categoria || !db.tickets.rolStaff) {
            return interaction.reply({ content: '❌ El sistema no se encuentra estructurado correctamente en este momento.', ephemeral: true });
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
            .setLabel('Detalla los motivos del ticket')
            .setPlaceholder('Describe de forma directa cuál es el inconveniente o solicitud...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputIgn),
            new ActionRowBuilder().addComponents(inputMotivo)
        );

        await interaction.showModal(modal);
    }

    // Procesamiento del Formulario Enviado por el Usuario
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
        await interaction.deferReply({ ephemeral: true });

        const tipoTicket = interaction.customId.replace('modal_ticket_', '');
        const ign = interaction.fields.getTextInputValue('ticket_ign');
        const motivo = interaction.fields.getTextInputValue('ticket_motivo');

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${tipoTicket}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: db.tickets.categoria,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: db.tickets.rolStaff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ],
        });

        const embedTicketInterno = new EmbedBuilder()
            .setTitle(`🧜‍♀️ DETALLES DEL TICKET: ${tipoTicket.toUpperCase()}`)
            .setDescription('Un miembro del equipo de soporte atenderá este caso a la brevedad posible. Puedes aportar capturas de pantalla o pruebas adicionales mientras esperas.')
            .setColor('#2ef9a0')
            .addFields(
                { name: '👤 Solicitante', value: `${interaction.user}`, inline: true },
                { name: '🎮 IGN (Nick)', value: `\`${ign}\``, inline: true },
                { name: '📝 Motivo', value: motivo, inline: false }
            )
            .setImage(IMAGEN_SIRENMC)
            .setTimestamp();

        // Botonera alineada al lado: Reclamar y Cerrar
        const filaComponentes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('reclamar_ticket')
                .setLabel('Reclamar Ticket')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🛡️'),
            new ButtonBuilder()
                .setCustomId('cerrar_ticket')
                .setLabel('Cerrar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({ 
            content: `||${interaction.user} | <@&${db.tickets.rolStaff}>||`, 
            embeds: [embedTicketInterno], 
            components: [filaComponentes] 
        });

        return interaction.editReply({ content: `✅ Canal asignado correctamente. Accede mediante: ${ticketChannel}` });
    }

    // --- MANEJO DE BOTONES INTERNOS ---
    if (interaction.isButton()) {
        // Botón Reclamar
        if (interaction.customId === 'reclamar_ticket') {
            const esStaff = interaction.member.roles.cache.has(db.tickets.rolStaff) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
            if (!esStaff) {
                return interaction.reply({ content: '❌ Solo los miembros del equipo de soporte pueden reclamar este canal.', ephemeral: true });
            }

            // Deshabilitar botón de reclamar modificando la botonera
            const filaActualizada = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reclamar_ticket')
                    .setLabel(`Reclamado por ${interaction.user.username}`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cerrar_ticket')
                    .setLabel('Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await interaction.message.edit({ components: [filaActualizada] });
            return interaction.reply({ content: `🛡️ El ticket ha sido tomado bajo control directo por ${interaction.user}.` });
        }

        // Botón Cerrar
        if (interaction.customId === 'cerrar_ticket') {
            await interaction.reply({ content: '🔒 Archivando conversación... Eliminación del canal activa en 5 segundos.' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch(e){}
            }, 5000);
        }
    }
});

// --- GESTIÓN DE BIENVENIDAS Y ALERTAS NITRO BOOST ---
client.on('guildMemberAdd', async (member) => {
    if (!db.bienvenidas.canal) return;
    const channel = member.guild.channels.cache.get(db.bienvenidas.canal);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🧜‍♀️ ¡Bienvenido/a a SirenMc Network! 🧜‍♀️')
        .setDescription(`Hola ${member}, nos alegra tenerte en nuestra comunidad.\n\nRecuerda revisar los canales de información general para no perderte de nada.`)
        .setColor('#00aaff')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Miembro registrado #${member.guild.memberCount}` });

    channel.send({ content: `¡Bienvenido/a ${member}!`, embeds: [embed] });
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (!db.boosts.canal) return;
    const channel = oldMember.guild.channels.cache.get(db.boosts.canal);
    if (!channel) return;

    if (!oldMember.premiumSince && newMember.premiumSince) {
        const embed = new EmbedBuilder()
            .setTitle('💎 ¡NUEVO BOOST DETECTADO! 💎')
            .setDescription(`Muchas gracias ${newMember} por apoyar a la red con tu **Nitro Boost**.\n\nTus beneficios dentro del servidor han sido otorgados con éxito. ✨`)
            .setColor('#ff73fa')
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }));

        channel.send({ embeds: [embed] });
    }
});

client.login(config.TOKEN);
