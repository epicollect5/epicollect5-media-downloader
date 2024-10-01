<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <ion-item>
            <ion-thumbnail slot="start">
              <img
                  alt="Epicollect5 Logo"
                  :src="state.logoSrc"
              />
            </ion-thumbnail>
            <ion-label>Epicollect5 Media Downloader <sup>Beta</sup></ion-label>
          </ion-item>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form
          @submit.prevent="submitForm"
          novalidate
      >
        <ion-grid>
          <ion-row>
            <ion-col>

              <!-- Project URL Input with Stacked Label -->
              <ion-item lines="none">
                <ion-label
                    position="stacked"
                    color="primary"
                >Project URL
                </ion-label>
                <ion-input
                    v-model="state.projectUrl"
                    type="url"
                    placeholder="Enter Project URL"
                    required
                    ref="projectUrlInput"
                ></ion-input>
                <div class="error-space">
                  <div
                      v-if="errors.projectUrl"
                      class="error-msg"
                  >{{ errors.projectUrl }}
                  </div>
                </div>
              </ion-item>

              <!-- Client ID Input with Stacked Label -->
              <ion-item lines="none">
                <ion-label
                    position="stacked"
                    color="primary"
                >Client ID
                </ion-label>
                <ion-input
                    v-model="state.clientId"
                    type="text"
                    placeholder="Enter Client ID"
                    :required="clientFieldsRequired"
                    ref="clientIdInput"
                ></ion-input>
                <div class="error-space">
                  <div
                      v-if="errors.clientId"
                      class="error-msg"
                  >{{ errors.clientId }}
                  </div>
                </div>
              </ion-item>

              <!-- Client Secret Input with Stacked Label -->
              <ion-item lines="none">
                <ion-label
                    position="stacked"
                    color="primary"
                >Client Secret
                </ion-label>
                <ion-input
                    v-model="state.clientSecret"
                    type="password"
                    placeholder="Enter Client Secret"
                    :required="clientFieldsRequired"
                    ref="clientSecretInput"
                ></ion-input>
                <div class="error-space">
                  <div
                      v-if="errors.clientSecret"
                      class="error-msg"
                  >{{ errors.clientSecret }}
                  </div>
                </div>
              </ion-item>

              <!-- Submit Button -->
              <ion-button
                  expand="block"
                  type="submit"
              >Submit
              </ion-button>

            </ion-col>
          </ion-row>
        </ion-grid>
      </form>

      <!-- Card to Display Project Info -->
      <ion-card v-if="state.projectStatus">
        <ion-card-header>
          <ion-card-title>{{ state.projectStatus.title }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>{{ state.projectStatus.message }}</ion-card-content>
      </ion-card>


    </ion-content>
  </ion-page>
</template>

<script>
import {reactive, ref} from 'vue';
import axios from 'axios';
import {notificationService} from '@/services/notification-service';
import {utilsService} from '@/services/utilities/utils-service';
import {webService} from '@/services/web-service';

export default {
  name: 'FormExample',

  setup() {
    const state = reactive({
      projectUrl: '',
      clientId: '',
      clientSecret: '',
      logoSrc: 'assets/epicollect5-logo.png',
      isProjectPublic: false,
      projectStatus: null // Added to store the project status message
    });

    async function downloadFiles(files) {
      const mediaEndpoint = 'https://five.epicollect.net/api/export/media/costa-rica-2017-shigella';
      const query = '?type=photo&format=entry_original&name=';

      try {
        // Show the folder picker using the File System Access API
        const downloadFolder = await window.showDirectoryPicker();

        await notificationService.showProgressDialog('Downloading', 'Please wait...');

        // Loop through each filename
        for (const filename of files) {
          const url = mediaEndpoint + query + filename;
          const response = await fetch(url);

          if (!response.ok) {
            console.error(`Failed to download ${filename}: ${response.statusText}`);
            continue; // Skip this file and move to the next one
          }

          const blob = await response.blob();

          // Save the file in the selected directory
          const fileHandle = await downloadFolder.getFileHandle(filename, {create: true});
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(blob);
          await writableStream.close();

          console.log(`Downloaded and saved ${filename}`);

          notificationService.hideProgressDialog(500);
        }
      } catch (error) {
        console.error('Error downloading files:', error);
      }
    }

    const errors = reactive({
      projectUrl: '',
      clientId: '',
      clientSecret: ''
    });

    const projectUrlInput = ref(null);
    const clientIdInput = ref(null);
    const clientSecretInput = ref(null);

    // Flag to track if clientId and clientSecret are required
    const clientFieldsRequired = ref(false);

    // Reactive array to store extracted entries
    let extractedEntries = reactive([]);


    const submitForm = async () => {
      clearErrors();

      state.projectUrl = 'https://five.epicollect.net/project/costa-rica-2017-shigella';

      // Validate the project URL first by sending an Axios request
      if (!state.projectUrl) {
        await notificationService.showAlert('Validation Error', 'Project URL is required.');
        errors.projectUrl = 'Project URL is required.';
        return;
      }

      // Extract server URL and project slug from the provided project URL
      const {server, projectSlug} = utilsService.extractServerAndSlug(state.projectUrl);
      if (!server || !projectSlug) {
        errors.projectUrl = 'Invalid Project URL.';
        return;
      }

      let mediaFiles = [];
      try {
        console.log(`${server}/api/export/entries/${projectSlug}`);
        const response = await axios.get(`${server}/api/export/entries/${projectSlug}`);

        // If status is 200, clientId and clientSecret are not required
        if (response.status === 200) {
          console.log('Project found. Proceed without client credentials.');

          // Project is public, no need for Client ID or Secret
          clientFieldsRequired.value = false;
          state.projectStatus = {
            title: 'Public Project',
            message: 'This project is public, no Client ID or Secret is required.'
          };
          state.isProjectPublic = true;

          clientFieldsRequired.value = false;
          //processForm(response); // Proceed with form submission logic
          extractedEntries = await webService.fetchEntries(server, projectSlug);
          console.log(extractedEntries);


          if (state.isProjectPublic) {
            mediaFiles = extractedEntries.map((entry) => {
              // Create a URL object to easily extract the query parameters
              const url = new URL(entry);
              // Extract the 'name' parameter
              // Return the value of the 'name' parameter
              return url.searchParams.get('name');
            });
          } else {
            mediaFiles = extractedEntries;
          }
        }

        console.log(mediaFiles);

        await downloadFiles(mediaFiles);


      } catch (error) {
        console.log(error);
        // If project URL is not found (404), clientId and clientSecret are required
        if (error.response && error.response.status === 404) {

          // Project is private, require Client ID and Secret
          clientFieldsRequired.value = true;
          state.projectStatus = {
            title: 'Private Project',
            message: 'This project is private. Please enter Client ID and Secret.'
          };

          clientFieldsRequired.value = true;

          // Manually validate clientId and clientSecret
          if (!state.clientId) {
            errors.clientId = 'Client ID is required.';
          }
          if (!state.clientSecret) {
            errors.clientSecret = 'Client Secret is required.';
          }

          // Show errors if present
          if (errors.clientId || errors.clientSecret) {
            return false;
          } else {
            console.log('Proceed with client credentials.');
            processForm();
          }
        } else {
          errors.projectUrl = 'Invalid Project URL or network error.';
        }
      }
    };


    const processForm = (response) => {
      console.log('Form Data:', state);
      console.log('Entries:', response);
      // Add your form submission logic here
    };

    const clearErrors = () => {
      errors.projectUrl = '';
      errors.clientId = '';
      errors.clientSecret = '';
    };

    return {
      state,
      errors,
      submitForm,
      projectUrlInput,
      clientIdInput,
      clientSecretInput,
      clientFieldsRequired
    };
  }
};
</script>

<style scoped>
ion-thumbnail {
  --border-radius: 50%;
}

.error-msg {
  color: red;
  font-size: 12px;
  margin-top: 5px;
}

.error-space {
  min-height: 20px;
}

ion-input {
  border-bottom: 1px solid var(--ion-color-primary);
}

ion-label {
  font-weight: 700;
  font-size: 24px !important;
}
</style>
