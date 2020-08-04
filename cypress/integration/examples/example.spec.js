describe('Lokalise', () => {

  const request = (options) => cy.request({
    headers: {
      'x-api-token': Cypress.env('API_TOKEN')
    },
    ...options
  }).its('body');

  const logout = () => {
    cy.get('div#menu-item__profile').click({ force: true });
    cy.get('[ href="/login?action=logout" ]').click({ force: true });
  };

  const login = (email, password) => {
    cy.visit('https://app.lokalise.com');
    cy.get('#signin-email').type(email);
    cy.get('#signinPassword').type(password);
    cy.get('[type="submit"]').click();
    cy.get('.main-grid').should('be.visible');
  };

  const loginAsOwner = () => login(Cypress.env('OWNER_EMAIL'), Cypress.env('OWNER_PASSWORD'));

  const loginAsTranslator = () => login(Cypress.env('TRANSLATOR_EMAIL'), Cypress.env('TRANSLATOR_PASSWORD'));

  const addProject = (name) => {
    cy.get('.new-project,.cta-heading').click();
    cy.get('#project-name').type(name);
    cy.get('#project-add').click();
  };

  const addTagToNthTask = (nth, name) => {
    cy.get('.fontello-edit-tags').eq(nth).should('be.visible').click();
    cy.get('.editable-input').type(`${name}{enter}`);
    cy.get('.select2-match').should('have.text', name).click();
    cy.get('.editableform-loading').should('not.exist');
  };

  const openTagFilterMenu = () => cy.get('[ data-id="projects-tag-selector" ]').click({ force: true });

  const toggleTagFilter = (name) => cy.xpath(`.//span[@class= "text"]//span[ contains(text(), "${name}")]`).click();

  const projectsShouldBe = (...names) => {
    cy.get('.lokalise-project').should('have.length', names.length);
    for (let i = 0; i < names.length; i += 1) {
      cy.get('.lokalise-project').filter(':visible').eq(i).contains(names[i]);
    }
  };

  const uploadFileFromFixtures = (...fixtureNames) => {
    for (let i = 0; i < fixtureNames.length; i += 1) {
      cy.get('.dropzone').attachFile(fixtureNames[i], { subjectType: 'drag-n-drop' });
    }
    cy.get('#do-upload', { timeout: 10000 }).click();
  };

  const alertShouldHaveText = (text) => cy.get('.alert-success').contains(text);

  const addContributor = (email, name, languages) => {
    cy.get('[ data-target="#contributors" ]').click();

    cy.get('#add-people-email').type(email);

    cy.get('#add-people-name').type(name);

    cy.get('.select2-search-choice a').click({ multiple: true });
    for (let i = 0; i < languages.length; i += 1) {
      cy.get('#s2id_add-people-langs-ro').click();
      cy.xpath(`.//*[contains( text(), "${languages[i]}" ) and @role = "option" ]`).click();
    }

    cy.get('#do-add-people').click();
  };

  const addTask = (name, description, languages) => {
    cy.get('#btn-task-new-link').click();
    cy.get('#new-task-title').type(name);
    cy.get('#new-task-description').type(description);

    cy.get('.nextBtn').eq(0).click();

    cy.get('.nextBtn').eq(1).click();
    for (let i = 0; i < languages.length; i += 1) {
      cy.get('.select2alt').click();
      cy.xpath(`.//*[contains(@class, "select2alt-__option") and contains(text(), "${languages[i]}")]`).click();
    }

    cy.get('.nextBtn').eq(2).click();
  };

  before(() => {
    request({
      url: 'https://api.lokalise.com/api2/projects'
    }).then(({ projects }) => {
      projects.map(({ project_id }) => project_id)
        .forEach((id) => request({
          url: `https://api.lokalise.com/api2/projects/${id}`,
          method: 'DELETE'
        }));
    });
  });

  it('Project creation and filtering flow', () => {

    loginAsOwner();

    addProject('Project #1');

    cy.visit('https://app.lokalise.com/projects');
    addProject('Project #2');

    cy.visit('https://app.lokalise.com/projects');
    cy.get('.main-search-input').type('Project #2{enter}');
    cy.get('.main-search-suggestion-value').should('have.length', 1).click();
    cy.get('.project-title-wrapper').should('have.text', 'Project #2');
  });

  it('Tag creation ant filtering flow', () => {
    loginAsOwner();

    addTagToNthTask(1, 'tag A');
    addTagToNthTask(3, 'tag B');
    addTagToNthTask(3, 'tag A');

    openTagFilterMenu();
    toggleTagFilter('tag B');
    projectsShouldBe('Project #2');

    toggleTagFilter('tag A');
    projectsShouldBe('Project #1', 'Project #2');

  });

  it('Upload key files flow', () => {
    loginAsOwner();

    cy.get('[href^="/upload"]').eq(1).click();

    uploadFileFromFixtures('en.json', 'ru.json', 'uk_UA.json');

    alertShouldHaveText('3 files were added to process queue');
  });

  it('Create contribution flow', () => {

    loginAsOwner();

    cy.get('[href^="/contributors"]').eq(1).click();
    addContributor('anastasia.chumak+4@lokalise.com', 'Anastasia', [ 'Ukraine', 'Russian' ]);

    alertShouldHaveText('Invited 1 users to the project');

  });

  it('Create and working task flow', () => {

    loginAsOwner();

    cy.get('[href^="/tasks"]').eq(1).click();

    addTask('task name', 'task description', [ 'Ukrainian', 'Russian' ]);

    logout();

    loginAsTranslator();
    cy.get('.project-big-wrapper .project-stat-title').click();

  });
});
